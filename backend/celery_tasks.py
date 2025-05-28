from app import celery
import requests
from app import app,db
from models import Conjunction
from datetime import datetime, timedelta
import math
from helper_functions import load_tle_objects, simulate_closest_approach, estimate_probability, classify_orbit_zone

@celery.task
def fetch_tle_satellite():
    tle_url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'
    output_file = 'cached_active.tle'
    
    try:
        response = requests.get(tle_url, timeout=10)
        response.raise_for_status()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        print(f"[SUCCESS] TLE data for active satellites saved to {output_file}")
    except Exception as e:
        print(f"[ERROR] Failed to fetch active satellites TLE data: {e}")

@celery.task
def fetch_tle_debris():
    tle_url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle'
    output_file = 'cached_debris.tle'
    
    try:
        response = requests.get(tle_url, timeout=10)
        response.raise_for_status()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        print(f"[SUCCESS] TLE data for IRIDIUM-33 debris saved to {output_file}")
    except Exception as e:
        print(f"[ERROR] Failed to fetch IRIDIUM-33 debris TLE data: {e}")


@celery.task
def detect_global_conjunctions():

    now = datetime.utcnow()
    end_time = now + timedelta(days=7)

    # Load first N satellites and debris (example: first 20 each)
    satellites = load_tle_objects('cached_active.tle', limit=20)
    debris = load_tle_objects('cached_debris.tle', limit=20)
    all_objects = satellites + debris
    
    with app.app_context():
        for i in range(len(all_objects)):
            for j in range(i + 1, len(all_objects)):
                obj1 = all_objects[i]
                obj2 = all_objects[j]

                min_dist, conj_time, v1, v2, rel_vel = simulate_closest_approach(obj1, obj2, now, end_time)

                if min_dist < 100:  # Threshold km, can adjust
                    conjunction = Conjunction(
                        object1_id=obj1['id'],
                        object1_name=obj1['name'],
                        object1_type=obj1['type'],
                        object2_id=obj2['id'],
                        object2_name=obj2['name'],
                        object2_type=obj2['type'],
                        detected_at=now,
                        conjunction_time=conj_time,
                        closest_distance_km=min_dist,
                        object1_velocity_km_s=v1,
                        object2_velocity_km_s=v2,
                        relative_velocity_km_s=rel_vel,
                        probability=estimate_probability(min_dist, rel_vel),
                        orbit_zone=classify_orbit_zone(obj1, obj2),
                        notes=None
                    )
                    db.session.add(conjunction)
        db.session.commit()
