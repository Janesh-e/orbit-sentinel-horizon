from skyfield.api import load, EarthSatellite

import math
from datetime import datetime, timedelta
from skyfield.api import load, EarthSatellite
from app import db  # Replace with your app context
from models import Conjunction  # Replace with your model import

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
            'type': 'satellite' if 'active' in tle_file else 'debris'
        })
    return objects

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
    conjunction = Conjunction(
        object1_id=obj1['id'],
        object1_name=obj1['name'],
        object1_type=obj1['type'],
        object2_id=obj2['id'],
        object2_name=obj2['name'],
        object2_type=obj2['type'],
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
