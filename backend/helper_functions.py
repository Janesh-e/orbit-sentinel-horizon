from skyfield.api import load, EarthSatellite, utc

import math
import numpy as np
from datetime import datetime, timedelta
from skyfield.api import load, EarthSatellite
#from app import db  
from models import Conjunction, ManeuverPlan 

ts = load.timescale()

def load_tle_objects(tle_file, limit=20):
    objects = []
    with open(tle_file, 'r', encoding='utf-8') as f:
        lines = f.read().strip().splitlines()
        lines = [line for line in lines if line.strip()]

    for i in range(0, min(len(lines), limit * 3), 3):
        name = lines[i].strip()
        line1 = lines[i + 1].strip()
        line2 = lines[i + 2].strip()
        sat = EarthSatellite(line1, line2, name, ts)
        objects.append({
            'id': i // 3,
            'name': name,
            'sat': sat,
            'type': 'satellite' if 'active' in tle_file else 'debris',
            'satnum': sat.model.satnum,
        })
    return objects

def load_tle_by_id(object_satnum, object_type):
    tle_file = 'cached_active.tle' if object_type.lower() == 'satellite' else 'cached_debris.tle'

    with open(tle_file, 'r', encoding='utf-8') as f:
        lines = f.read().strip().splitlines()
        lines = [line for line in lines if line.strip()]

    for i in range(0, len(lines), 3):
        if i + 2 >= len(lines):
            continue  # skip incomplete TLE blocks

        name = lines[i].strip()
        line1 = lines[i + 1].strip()
        line2 = lines[i + 2].strip()

        satellite = EarthSatellite(line1, line2, name)
        
        if str(satellite.model.satnum) == str(object_satnum):
            return satellite

    raise ValueError(f"TLE for object ID {object_satnum} not found in {tle_file}")

def simulate_closest_approach(obj1, obj2, start_time, end_time, time_step_minutes=10):
    min_dist = float('inf')
    conj_time = None
    min_v1 = min_v2 = min_rel_vel = 0

    time = start_time
    while time <= end_time:
        ts_time = ts.utc(time.year, time.month, time.day, time.hour, time.minute, time.second)
        geocentric1 = obj1['sat'].at(ts_time)
        geocentric2 = obj2['sat'].at(ts_time)

        pos1 = geocentric1.position.km
        pos2 = geocentric2.position.km

        dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(pos1, pos2)))
        
        vel1 = geocentric1.velocity.km_per_s
        vel2 = geocentric2.velocity.km_per_s

        rel_vel = math.sqrt(sum((v1 - v2) ** 2 for v1, v2 in zip(vel1, vel2)))

        if dist < min_dist:
            min_dist = dist
            conj_time = time
            min_v1 = math.sqrt(sum(v ** 2 for v in vel1))
            min_v2 = math.sqrt(sum(v ** 2 for v in vel2))
            min_rel_vel = rel_vel

        time += timedelta(minutes=time_step_minutes)

    return min_dist, conj_time, min_v1, min_v2, min_rel_vel

def estimate_probability(distance_km, rel_velocity_km_s):
    if distance_km < 1:
        return 0.9  # very high risk
    elif distance_km < 5:
        return 0.6  # medium risk
    elif distance_km < 10:
        return 0.3  # low risk
    else:
        return 0.1  # negligible

def classify_orbit_zone(obj1, obj2):
    # Rough altitude classification
    alt1 = obj1['sat'].model.a * 6378.137 - 6371
    alt2 = obj2['sat'].model.a * 6378.137 - 6371

    def zone(alt):
        if alt < 2000:
            return 'LEO'
        elif alt < 35786:
            return 'MEO'
        elif alt < 40000:
            return 'GEO'
        else:
            return 'HEO'

    if zone(alt1) == zone(alt2):
        return zone(alt1)
    else:
        return f"Mixed ({zone(alt1)}/{zone(alt2)})"

def store_conjunction(obj1, obj2, min_dist, conj_time, min_v1, min_v2, min_rel_vel):
    from app import db
    conjunction = Conjunction(
        object1_id=obj1['id'],
        object1_name=obj1['name'],
        object1_type=obj1['type'],
        object1_satnum=obj1['satnum'],
        object2_id=obj2['id'],
        object2_name=obj2['name'],
        object2_type=obj2['type'],
        object2_satnum=obj2['satnum'],
        detected_at=datetime.utcnow(),
        conjunction_time=conj_time,
        closest_distance_km=min_dist,
        object1_velocity_km_s=min_v1,
        object2_velocity_km_s=min_v2,
        relative_velocity_km_s=min_rel_vel,
        probability=estimate_probability(min_dist, min_rel_vel),
        orbit_zone=classify_orbit_zone(obj1, obj2),
        notes=None
    )
    db.session.add(conjunction)

# Example Celery Task
def detect_global_conjunctions():
    from app import db
    now = datetime.utcnow()
    end_time = now + timedelta(days=7)

    satellites = load_tle_objects('cached_active.tle', limit=20)
    debris = load_tle_objects('cached_iridium_debris.tle', limit=20)
    all_objects = satellites + debris

    for i in range(len(all_objects)):
        for j in range(i + 1, len(all_objects)):
            obj1 = all_objects[i]
            obj2 = all_objects[j]

            min_dist, conj_time, min_v1, min_v2, min_rel_vel = simulate_closest_approach(obj1, obj2, now, end_time)

            if min_dist < 10:  # Threshold km
                store_conjunction(obj1, obj2, min_dist, conj_time, min_v1, min_v2, min_rel_vel)

    db.session.commit()


def compute_maneuver_for_conjunction(conjunction):
    ts = load.timescale()
    conj_time = ts.from_datetime(conjunction.conjunction_time.replace(tzinfo=utc))

    # Load TLEs
    try:
        sat1 = load_tle_by_id(conjunction.object1_satnum, conjunction.object1_type)
        sat2 = load_tle_by_id(conjunction.object2_satnum, conjunction.object2_type)
    except ValueError as e:
        print(e)
        return None

    # Get positions and velocities (km, km/s)
    geocentric1 = sat1.at(conj_time)
    geocentric2 = sat2.at(conj_time)

    pos1 = geocentric1.position.km
    vel1 = geocentric1.velocity.km_per_s
    pos2 = geocentric2.position.km
    vel2 = geocentric2.velocity.km_per_s

    rel_pos_vec = np.subtract(pos1, pos2)
    rel_vel_vec = np.subtract(vel1, vel2)

    rel_pos = np.linalg.norm(rel_pos_vec)
    rel_vel = np.linalg.norm(rel_vel_vec)

    print(f"Relative position at conjunction: {rel_pos:.3f} km")
    print(f"Relative velocity at conjunction: {rel_vel:.3f} km/s")

    # Decide which object to maneuver
    maneuver_object_id = conjunction.object1_id if conjunction.object1_type.lower() == 'satellite' else conjunction.object2_id

    # Minimal displacement (safety margin: +500 m)
    minimal_displacement_km = conjunction.closest_distance_km + 0.5
    required_delta_v_km_s = minimal_displacement_km / (rel_vel + 1e-6)  # avoid div by zero

    # Clamp to operational limits: convert to m/s
    required_delta_v_m_s = max(0.01, min(required_delta_v_km_s * 1000, 5.0))

    # Estimate fuel cost (rough): ~0.05 kg per 0.1 m/s
    fuel_cost_kg = required_delta_v_m_s * 0.5

    # Assume 95% risk reduction if maneuver succeeds
    risk_reduction_percent = 95.0

    # Earliest execution time: 2 hours from now
    execution_time = datetime.utcnow() + timedelta(hours=2)

    # Create maneuver plan record
    plan = ManeuverPlan(
        conjunction_id=conjunction.id,
        object_id=maneuver_object_id,
        maneuver_type='along-track',
        delta_v=required_delta_v_m_s,
        execution_time=execution_time,
        expected_miss_distance=conjunction.closest_distance_km + 1.0,  # +1 km safety
        fuel_cost=fuel_cost_kg,
        risk_reduction=risk_reduction_percent
    )

    print(f"Generated maneuver plan: Δv={required_delta_v_m_s:.3f} m/s, fuel={fuel_cost_kg:.3f} kg")

    return plan

def get_detected_conjunctions(past_days=7):
    """
    Retrieve conjunctions detected in the past N days from the database.
    """
    cutoff_time = datetime.utcnow() - timedelta(days=past_days)
    conjunctions = Conjunction.query.filter(Conjunction.detected_at >= cutoff_time).all()
    return conjunctions