from flask import Flask, jsonify
from skyfield.api import load, EarthSatellite
import requests
from flask_cors import CORS
from datetime import datetime
import time
import math

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

celery.conf.beat_schedule = {
    'fetch-tle-every-6-hours': {
        'task': 'tasks.fetch_tle',
        'schedule': crontab(minute=0, hour='*/6'),  # every 6 hours
    },
}
celery.conf.timezone = 'UTC'

# celery -A app.celery worker --loglevel=info
# celery -A app.celery beat --loglevel=info

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
    orbital_data.sort(key=lambda x: (x["orbitType"], -x["riskFactor"] if x["riskFactor"] else 0))
    
    return jsonify(orbital_data[:100])  # Limit to prevent performance issues


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



if __name__ == '__main__':
    app.run(debug=True)
