from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from models import db, Conjunction, ManeuverPlan
from skyfield.api import load, EarthSatellite
import requests
from flask_cors import CORS
from datetime import datetime
import time
import math
from datetime import timedelta
import networkx as nx
import json

from helper_functions import load_tle_objects, get_detected_conjunctions, conj_to_dict

from celery import Celery
from celery.schedules import crontab

def make_celery(app):
    celery = Celery(
        app.import_name,
        backend='redis://localhost:6379/0',  # Redis backend
        broker='redis://localhost:6379/0'    # Redis broker
    )
    celery.conf.update(app.config)
    return celery

app = Flask(__name__)
celery = make_celery(app)
CORS(app)
ts = load.timescale()

# Configure the database URI
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///conjunctions.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the SQLAlchemy object
db.init_app(app)

def create_database():
    with app.app_context():
        db.create_all()
        print("✅ Database and tables created (if they didn't exist)")


celery.conf.beat_schedule = {
    'fetch-tle-every-6-hours': {
        'task': 'celery_tasks.fetch_tle_satellite',
        'schedule': crontab(minute=0, hour='*/6'),  # every 6 hours
    },
    'fetch-iridium-debris-every-6-hours': {
        'task': 'celery_tasks.fetch_tle_debris',
        'schedule': crontab(minute=0, hour='*/6'),  # every 6 hours
    },
    'detect-conjunctions-every-12-hours': {
        'task': 'tasks.detect_global_conjunctions',
        'schedule': crontab(minute=0, hour='*/12'),  # every 12 hours
    },
}
celery.conf.timezone = 'UTC'

# Cache for satellite data
satellite_cache = {
    'data': [],
    'last_update': 0,
    'update_interval': 30  # seconds
}

@app.route('/api/satellites')
def get_satellite_positions():
    current_time = time.time()

    # Check if we need to fetch fresh data
    if current_time - satellite_cache['last_update'] > satellite_cache['update_interval']:
        # Fetch fresh data
        tle_url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'
        response = requests.get(tle_url)
        lines = response.text.strip().splitlines()

        satellites = []
        now = ts.now()

        for i in range(0, len(lines), 3):
            try:
                name = lines[i].strip()
                line1 = lines[i + 1].strip()
                line2 = lines[i + 2].strip()
                satellite = EarthSatellite(line1, line2, name, ts)
                geocentric = satellite.at(now)
                x, y, z = geocentric.position.km
                inclination = satellite.model.inclo

                satellites.append({
                    "id": str(i // 3),  # Ensure string ID for consistency
                    "name": name,
                    "x": x,
                    "y": y,
                    "z": z,
                    "inclination": inclination * 180 / 3.14159,
                    "type": "satellite",
                    "orbitType": classify_orbit(geocentric.position.km),
                    "riskFactor": calculate_risk_factor(x, y, z),  # Add risk calculation
                    "timestamp": current_time
                })
            except Exception as e:
                continue

        satellite_cache['data'] = satellites[:100]
        satellite_cache['last_update'] = current_time
    
    return jsonify(satellite_cache['data'])

def calculate_risk_factor(x, y, z):
    # Simple risk calculation based on orbital density
    # You can make this more sophisticated
    from math import sqrt
    altitude = sqrt(x**2 + y**2 + z**2) - 6371  # Earth radius
    
    if altitude < 500:  # Very low orbit
        return min(90, max(20, 100 - altitude / 10))
    elif altitude < 2000:  # LEO
        return min(70, max(10, 80 - altitude / 50))
    else:
        return max(5, 30 - altitude / 1000)
'''
def classify_orbit(position):
    from math import sqrt
    r = sqrt(sum(coord**2 for coord in position))
    if r < 2000:
        return "LEO"
    elif r < 35786:
        return "MEO"
    else:
        return "GEO"
'''

def classify_orbit(altitude):
    if altitude < 2000:
        return "LEO"
    elif altitude < 35786:
        return "MEO"
    else:
        return "GEO"


# Add endpoint for real-time position updates (optional)
@app.route('/api/satellites/positions')
def get_real_time_positions():
    """Return just position updates for existing satellites"""
    if not satellite_cache['data']:
        return jsonify([])
    
    now = ts.now()
    positions = []
    
    for sat_data in satellite_cache['data']:
        try:
            # Recalculate current position without fetching new TLE data
            # This is faster but uses cached orbital elements
            positions.append({
                "id": sat_data["id"],
                "x": sat_data["x"],  # In a real implementation, recalculate based on time
                "y": sat_data["y"],
                "z": sat_data["z"],
                "timestamp": time.time()
            })
        except:
            continue
    
    return jsonify(positions)

def calculate_collision_risk(x, y, z, semi_major_axis):
    """Calculate collision risk based on orbital density and altitude"""
    altitude = math.sqrt(x*x + y*y + z*z) - 6371
    
    # Higher risk in congested LEO region
    if altitude < 600:
        base_risk = 85
    elif altitude < 1000:
        base_risk = 70
    elif altitude < 2000:
        base_risk = 45
    else:
        base_risk = 20
    
    # Add randomness for demo (in reality, calculate based on TLE age, etc.)
    import random
    risk_modifier = random.uniform(0.7, 1.3)
    
    return min(95, max(5, base_risk * risk_modifier))

@app.route('/api/satellites/orbital-elements')
def get_orbital_elements():
    """Return orbital elements for real-time simulation"""
    output_file = 'cached_active.tle'
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            lines = f.read().strip().splitlines()
            lines = [line for line in lines if line.strip()]
        print(f"Total cleaned lines: {len(lines)}")
    except FileNotFoundError:
        return jsonify({"error": "Cached TLE file not found."}), 500

    orbital_data = []
    now = ts.now()

    for i in range(0, len(lines), 3):
        #print(repr(lines[i]), repr(lines[i+1]), repr(lines[i+2]))
        try:
            name = lines[i].strip()
            line1 = lines[i + 1].strip()
            line2 = lines[i + 2].strip()
            
            satellite = EarthSatellite(line1, line2, name, ts)
            
            # Extract orbital elements from TLE
            satrec = satellite.model
            
            # Calculate orbital parameters
            semi_major_axis = satrec.a * 6378.137  # Convert to km
            eccentricity = satrec.ecco
            inclination = satrec.inclo  # radians
            right_ascension = satrec.nodeo  # radians
            arg_of_perigee = satrec.argpo  # radians
            mean_anomaly = satrec.mo  # radians
            mean_motion = satrec.no_kozai * (2 * math.pi) / (24 * 3600)  # rad/s
            
            # Calculate period in minutes
            period_minutes = (2 * math.pi) / mean_motion / 60
            
            # Get current position for initial display
            geocentric = satellite.at(now)
            x, y, z = geocentric.position.km
            
            orbital_data.append({
                "id": str(i // 3),
                "name": name,
                "semiMajorAxis": semi_major_axis,
                "eccentricity": eccentricity,
                "inclination": inclination,
                "rightAscension": right_ascension,
                "argumentOfPerigee": arg_of_perigee,
                "meanAnomaly": mean_anomaly,
                "meanMotion": mean_motion,
                "period": period_minutes,
                "epoch": now.tt,  # TLE epoch
                "currentPosition": {"x": x, "y": y, "z": z},
                "type": "satellite",
                "orbitType": classify_orbit(semi_major_axis - 6371),
                "riskFactor": calculate_collision_risk(x, y, z, semi_major_axis),
                "noradId": satrec.satnum
            })
        except Exception as e:
            #print(f"Error processing satellite {i//3}: {e}")
            continue

    # Sort by orbit type and risk for better visualization
    # orbital_data.sort(key=lambda x: (x["orbitType"], -x["riskFactor"] if x["riskFactor"] else 0))
    
    return jsonify(orbital_data[:2100])  # Limit to prevent performance issues


@app.route('/api/satellites/live-positions')
def get_live_positions():
    """Get current positions calculated server-side for validation"""
    # This endpoint can be used to validate client-side calculations
    tle_url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'
    response = requests.get(tle_url)
    lines = response.text.strip().splitlines()

    positions = []
    now = ts.now()

    for i in range(0, min(len(lines), 300), 3):  # Limit for performance
        try:
            name = lines[i].strip()
            line1 = lines[i + 1].strip()
            line2 = lines[i + 2].strip()
            
            satellite = EarthSatellite(line1, line2, name, ts)
            geocentric = satellite.at(now)
            x, y, z = geocentric.position.km
            
            # Calculate velocity
            velocity = geocentric.velocity.km_per_s
            
            positions.append({
                "id": str(i // 3),
                "x": x, "y": y, "z": z,
                "vx": velocity[0], "vy": velocity[1], "vz": velocity[2],
                "timestamp": now.tt
            })
        except:
            continue

    return jsonify(positions)


@app.route('/api/satellite/<int:sat_id>')
def get_satellite_details(sat_id):
    output_file = 'cached_active.tle'
    
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            lines = f.read().strip().splitlines()
            # Remove blank lines
            lines = [line for line in lines if line.strip()]
    except FileNotFoundError:
        return jsonify({"error": "Cached TLE file not found."}), 500
    
    # Each satellite has 3 lines: name, line1, line2
    total_sats = len(lines) // 3
    if sat_id < 0 or sat_id >= total_sats:
        return jsonify({"error": "Satellite ID out of range."}), 404
    
    idx = sat_id * 3
    try:
        name = lines[idx].strip()
        line1 = lines[idx + 1].strip()
        line2 = lines[idx + 2].strip()
        
        satellite = EarthSatellite(line1, line2, name, ts)
        satrec = satellite.model
        
        # Orbital parameters
        semi_major_axis = satrec.a * 6378.137  # km
        eccentricity = satrec.ecco
        inclination = math.degrees(satrec.inclo)  # convert radians to degrees
        # Calculate current velocity magnitude (km/s)
        now = ts.now()
        geocentric = satellite.at(now)
        velocity = geocentric.velocity.km_per_s
        speed = math.sqrt(sum(v**2 for v in velocity))
        
        # Altitude approx (semi-major axis - Earth's radius)
        altitude = semi_major_axis - 6371
        
        # Risk factor
        risk_factor = calculate_collision_risk(*geocentric.position.km, semi_major_axis)
        
        # Orbit type
        orbit_type = classify_orbit(altitude)
        
        # Launch date: TLE doesn't contain launch date; we can try to parse it from name if embedded,
        # otherwise put None or a placeholder.
        launch_date = None
        
        # Last updated time = TLE epoch time
        # TLE epoch in Julian days since 1949 December 31 00:00 UT
        # skyfield ts.tt is Terrestrial Time, get datetime from satellite.epoch
        tle_epoch_dt = satellite.epoch.utc_datetime()
        
        # Compose response
        result = {
            "id": sat_id,
            "name": name,
            "type": "satellite",
            "launchDate": launch_date,
            "riskFactor": risk_factor,
            "lastUpdated": tle_epoch_dt.isoformat(),
            "orbitType": orbit_type,
            "altitude_km": altitude,
            "inclination_deg": inclination,
            "velocity_km_s": speed,
            "tle": {
                "line1": line1,
                "line2": line2
            }
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Error processing satellite: {e}"}), 500


@app.route('/api/debris/orbital-elements')
def get_debris_orbital_elements():
    """Return orbital elements for debris objects for real-time simulation"""
    output_file = 'cached_debris.tle'
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            lines = f.read().strip().splitlines()
            lines = [line for line in lines if line.strip()]
    except FileNotFoundError:
        return jsonify({"error": "Cached debris TLE file not found."}), 500

    orbital_data = []
    now = ts.now()

    for i in range(0, len(lines), 3):
        try:
            name = lines[i].strip()
            line1 = lines[i + 1].strip()
            line2 = lines[i + 2].strip()
            
            satellite = EarthSatellite(line1, line2, name, ts)
            satrec = satellite.model

            semi_major_axis = satrec.a * 6378.137  # km
            eccentricity = satrec.ecco
            inclination = satrec.inclo  # radians
            right_ascension = satrec.nodeo  # radians
            arg_of_perigee = satrec.argpo  # radians
            mean_anomaly = satrec.mo  # radians
            mean_motion = satrec.no_kozai * (2 * math.pi) / (24 * 3600)  # rad/s

            period_minutes = (2 * math.pi) / mean_motion / 60

            geocentric = satellite.at(now)
            x, y, z = geocentric.position.km

            orbital_data.append({
                "id": str(i // 3),
                "name": name,
                "semiMajorAxis": semi_major_axis,
                "eccentricity": eccentricity,
                "inclination": inclination,
                "rightAscension": right_ascension,
                "argumentOfPerigee": arg_of_perigee,
                "meanAnomaly": mean_anomaly,
                "meanMotion": mean_motion,
                "period": period_minutes,
                "epoch": now.tt,
                "currentPosition": {"x": x, "y": y, "z": z},
                "type": "debris",
                "orbitType": classify_orbit(semi_major_axis - 6371),
                "riskFactor": calculate_collision_risk(x, y, z, semi_major_axis),
                "noradId": satrec.satnum
            })
        except Exception as e:
            continue

    orbital_data.sort(key=lambda x: (x["orbitType"], -x["riskFactor"] if x["riskFactor"] else 0))
    
    return jsonify(orbital_data[:20])  # limit for performance


@app.route('/api/debris/<int:debris_id>')
def get_debris_details(debris_id):
    output_file = 'cached_debris.tle'

    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            lines = f.read().strip().splitlines()
            lines = [line for line in lines if line.strip()]
    except FileNotFoundError:
        return jsonify({"error": "Cached debris TLE file not found."}), 500

    total_debris = len(lines) // 3
    if debris_id < 0 or debris_id >= total_debris:
        return jsonify({"error": "Debris ID out of range."}), 404

    idx = debris_id * 3
    try:
        name = lines[idx].strip()
        line1 = lines[idx + 1].strip()
        line2 = lines[idx + 2].strip()

        satellite = EarthSatellite(line1, line2, name, ts)
        satrec = satellite.model

        semi_major_axis = satrec.a * 6378.137  # km
        eccentricity = satrec.ecco
        inclination = math.degrees(satrec.inclo)
        now = ts.now()
        geocentric = satellite.at(now)
        velocity = geocentric.velocity.km_per_s
        speed = math.sqrt(sum(v**2 for v in velocity))

        altitude = semi_major_axis - 6371

        risk_factor = calculate_collision_risk(*geocentric.position.km, semi_major_axis)
        orbit_type = classify_orbit(altitude)

        launch_date = None
        tle_epoch_dt = satellite.epoch.utc_datetime()

        result = {
            "id": debris_id,
            "name": name,
            "type": "debris",
            "launchDate": launch_date,
            "riskFactor": risk_factor,
            "lastUpdated": tle_epoch_dt.isoformat(),
            "orbitType": orbit_type,
            "altitude_km": altitude,
            "inclination_deg": inclination,
            "velocity_km_s": speed,
            "tle": {
                "line1": line1,
                "line2": line2
            }
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Error processing debris: {e}"}), 500


@app.route('/api/simulate-conjunction', methods=['POST'])
def simulate_conjunction():
    data = request.get_json()
    print(f'Obtained json : {data}')
    object_id = data.get('id')
    object_type = data.get('type')
    days = int(data.get('days', 7))  # Default to 7 days if not provided
    threshold_km = float(data.get('threshold_km', 10.0))  # Default to 10 km
    threshold_km = 1000

    # Load appropriate TLE file
    tle_file = 'cached_active.tle' if object_type == 'satellite' else 'cached_debris.tle'

    try:
        with open(tle_file, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        return jsonify({"error": f"{tle_file} not found."}), 500

    # Get selected object
    idx = object_id * 3
    try:
        name = lines[idx]
        line1 = lines[idx + 1]
        line2 = lines[idx + 2]
        print(f"TLE : {name}\n{line1}\n{line2}")
        selected_sat = EarthSatellite(line1, line2, name, ts)
    except Exception as e:
        return jsonify({"error": f"Error loading selected object: {e}"}), 500

    # Load all other satellites + debris
    other_objects = []

    def load_tle_file(filename, skip_id=None, skip_type=None):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                lns = [line.strip() for line in f if line.strip()]
            max_satellites = 20
            for i in range(0, min(len(lns), max_satellites * 3), 3):
                if filename == tle_file and i // 3 == skip_id and skip_type == object_type:
                    continue  # Skip self
                obj_name = lns[i]
                l1 = lns[i + 1]
                l2 = lns[i + 2]
                obj_sat = EarthSatellite(l1, l2, obj_name, ts)
                other_objects.append({
                    "id": i // 3,
                    "name": obj_name,
                    "sat": obj_sat,
                    "type": 'satellite' if filename == 'cached_active.tle' else 'debris'
                })
        except FileNotFoundError:
            pass

    load_tle_file('cached_active.tle', skip_id=object_id, skip_type=object_type)
    print("----------Loaded satellites----------")
    load_tle_file('cached_debris.tle')
    print("----------Loaded Debris----------")

    # Simulation setup
    t0 = ts.now()
    t1 = ts.now() + timedelta(days=days)
    minutes_step = 10  # every 10 minutes

    conjunctions = []

    current_time = t0
    iter = 0
    while current_time < t1:
        sel_pos = selected_sat.at(current_time).position.km

        for obj in other_objects:
            obj_pos = obj['sat'].at(current_time).position.km
            distance = math.sqrt(sum((sel_pos[i] - obj_pos[i]) ** 2 for i in range(3)))
            if distance < threshold_km:
                # Relative velocity estimate
                sel_vel = selected_sat.at(current_time).velocity.km_per_s
                obj_vel = obj['sat'].at(current_time).velocity.km_per_s
                rel_velocity = math.sqrt(sum((sel_vel[i] - obj_vel[i]) ** 2 for i in range(3)))

                # Simple probability estimate (for now just inverse of distance, scaled)
                probability = min(1.0, (threshold_km - distance) / threshold_km)

                conjunctions.append({
                    "withId": obj['id'],
                    "withName": obj['name'],
                    "withType": obj['type'],
                    "closestDistance_km": distance,
                    "relativeVelocity_km_s": rel_velocity,
                    "probability": probability,
                    "time": current_time.utc_iso()
                })

        current_time = current_time + timedelta(minutes=minutes_step)
        #print(f"iter : {iter}")
        iter=iter+1

    # Optional: remove duplicates or merge closest approaches
    # Sort by probability or time
    conjunctions.sort(key=lambda x: (-x['probability'], x['time']))
    print(f"Total conjunctions : {len(conjunctions)}")

    return jsonify({"objectId": object_id, "objectType": object_type, "conjunctions": conjunctions})


@app.route('/api/daily_conjunctions', methods=['GET'])
def get_conjunctions_by_date():
    # Get date from query param (e.g., /api/conjunctions?date=2025-05-28)
    date_str = request.args.get('date')

    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    else:
        target_date = datetime.utcnow().date()

    try:
        conjunctions = Conjunction.query.filter(
            db.func.date(Conjunction.detected_at) == target_date
        ).all()

        result = []
        for conj in conjunctions:
            result.append({
                "id": conj.id,
                "object1_id": conj.object1_id,
                "object1_name": conj.object1_name,
                "object1_type": conj.object1_type,
                "object2_id": conj.object2_id,
                "object2_name": conj.object2_name,
                "object2_type": conj.object2_type,
                "detected_at": conj.detected_at.isoformat(),
                "closest_distance_km": conj.closest_distance_km,
                "conjunction_time": conj.conjunction_time.isoformat(),
                "object1_velocity_km_s": conj.object1_velocity_km_s,
                "object2_velocity_km_s": conj.object2_velocity_km_s,
                "relative_velocity_km_s": conj.relative_velocity_km_s,
                "probability": conj.probability,
                "orbit_zone": conj.orbit_zone,
                "notes": conj.notes
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Failed to retrieve conjunctions: {str(e)}"}), 500

@app.route('/api/conjunctions/upcoming/<int:satnum>')
def get_upcoming_conjunctions(satnum):
    now = datetime.utcnow()
    conjunctions = Conjunction.query.filter(
        Conjunction.conjunction_time >= now,
        ((Conjunction.object1_id == satnum) | (Conjunction.object2_id == satnum))
    ).order_by(Conjunction.conjunction_time.asc()).all()

    results = [conj_to_dict(conj) for conj in conjunctions]
    return jsonify(results)

@app.route('/api/conjunctions/history/<int:satnum>')
def get_conjunction_history(satnum):
    conjunctions = Conjunction.query.filter(
        (Conjunction.object1_id == satnum) | (Conjunction.object2_id == satnum)
    ).order_by(Conjunction.conjunction_time.desc()).all()

    results = [conj_to_dict(conj) for conj in conjunctions]
    return jsonify(results)


@app.route('/api/maneuver/<int:conjunction_id>', methods=['GET'])
def get_maneuver_by_conjunction(conjunction_id):
    maneuver = ManeuverPlan.query.filter_by(conjunction_id=conjunction_id).first()

    if not maneuver:
        return jsonify({'error': f'No maneuver plan found for conjunction ID {conjunction_id}'}), 404

    maneuver_data = {
        'conjunction_id': maneuver.conjunction_id,
        'object_id': maneuver.object_id,
        'maneuver_type': maneuver.maneuver_type,
        'delta_v_m_s': maneuver.delta_v,
        'execution_time': maneuver.execution_time.isoformat(),
        'expected_miss_distance_km': maneuver.expected_miss_distance,
        'fuel_cost_kg': maneuver.fuel_cost,
        'risk_reduction_percent': maneuver.risk_reduction
    }

    return jsonify(maneuver_data), 200

@app.route('/api/space-traffic-graph')
def space_traffic_graph():
    G = nx.Graph()

    # Load satellite and debris data (you can adjust the limits)
    satellites = load_tle_objects('cached_active.tle', limit=100)
    debris = load_tle_objects('cached_debris.tle', limit=100)
    all_objects = satellites + debris

    # Add nodes to graph
    for obj in all_objects:
        semi_major_axis_km = obj['sat'].model.a * 6378.137  # compute semi-major axis in km
        orbit_zone = classify_orbit(semi_major_axis_km - 6371)
        t = ts.now()
        geocentric = obj['sat'].at(t)
        x, y, z = geocentric.position.km

        G.add_node(
            obj['id'],
            name=obj['name'],
            type=obj['type'],
            orbit_zone=orbit_zone,
            risk_factor=calculate_collision_risk(x, y, z, semi_major_axis_km),
            semi_major_axis=semi_major_axis_km
        )

    # Add edges from known conjunctions
    conjunctions = get_detected_conjunctions(past_days=7)
    for conj in conjunctions:
        G.add_edge(
            conj.object1_id,
            conj.object2_id,
            weight=conj.closest_distance_km,
            conjunction_time=conj.conjunction_time.isoformat(),
            risk=conj.probability
        )

    # Optional: add edges for satellites in the same orbital shell (clustering)
    orbit_zone_groups = {}
    for node_id, attrs in G.nodes(data=True):
        zone = attrs['orbit_zone']
        orbit_zone_groups.setdefault(zone, []).append(node_id)

    for group in orbit_zone_groups.values():
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                if not G.has_edge(group[i], group[j]):
                    G.add_edge(group[i], group[j], weight=9999, note='same_orbit_cluster')

    # Build JSON payload
    graph_data = {
        'nodes': [
            {
                'id': n,
                'name': d['name'],
                'type': d['type'],
                'orbit_zone': d['orbit_zone'],
                'risk_factor': d['risk_factor'],
                'semi_major_axis': d['semi_major_axis']
            }
            for n, d in G.nodes(data=True)
        ],
        'edges': [
            {
                'source': u,
                'target': v,
                'weight': d['weight'],
                'conjunction_time': d.get('conjunction_time'),
                'risk': d.get('risk'),
                'note': d.get('note')
            }
            for u, v, d in G.edges(data=True)
        ]
    }

    return jsonify(graph_data)


if __name__ == '__main__':
    create_database()
    app.run(debug=True)
