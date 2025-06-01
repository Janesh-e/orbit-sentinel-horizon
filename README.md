ORBITAL SHIELD - Space Traffic Management Platform

This project is a space traffic management platform that performs:
✅ Satellite and debris simulation using TLE data
✅ Conjunction detection and collision risk assessment
✅ Maneuver planning for mitigation
✅ Interactive Space Traffic Network Graph visualization
✅ Heatmaps and analytical dashboards

Setup Instructions

1️⃣ Prerequisites

Python 3.9 or above

Redis (for Celery task queue)

SQLite (for the database)

Node.js + npm (if you want to run the frontend locally)

2️⃣ Clone the Repository

git clone https://github.com/Janesh-e/orbit-sentinel-horizon.git
cd orbit-sentinel-horizon

3️⃣ Setup Python Environment

```
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4️⃣ Setup Redis (for Celery)

Make sure Redis is running:

```
redis-server
```

5️⃣ Start Celery Worker

```
celery -A tasks.celery worker --loglevel=info
```

6️⃣ Start the Backend Server

```
python app.py
```

7️⃣ (Optional) Start the Frontend

```
cd frontend
npm install
npm run dev
```

Running Scheduled Tasks

The system automatically runs detect_global_conjunctions every 12 hours via Celery beat. To enable that:

celery -A tasks.celery beat --loglevel=info

API Endpoints

/api/satellites/orbital-elements: Get satellite positions and elements

/api/debris/orbital-elements: Get debris positions and elements

/api/daily_conjunctions: Get detected conjunctions

/api/maneuver/<conjunction_id>: Get maneuver plan for a conjunction

/api/space-traffic-graph: Get graph data for network visualization


## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Flask



