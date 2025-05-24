from app import celery
import requests

@celery.task
def fetch_tle():
    tle_url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'
    output_file = 'cached_active.tle'
    
    try:
        response = requests.get(tle_url, timeout=10)
        response.raise_for_status()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        print(f"[SUCCESS] TLE data saved to {output_file}")
    except Exception as e:
        print(f"[ERROR] Failed to fetch TLE data: {e}")
