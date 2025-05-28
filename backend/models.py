from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Conjunction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    object1_id = db.Column(db.Integer)
    object1_name = db.Column(db.String)
    object1_type = db.Column(db.String)
    object2_id = db.Column(db.Integer)
    object2_name = db.Column(db.String)
    object2_type = db.Column(db.String)
    detected_at = db.Column(db.DateTime)
    conjunction_time = db.Column(db.DateTime)
    closest_distance_km = db.Column(db.Float)
    object1_velocity_km_s = db.Column(db.Float)
    object2_velocity_km_s = db.Column(db.Float)
    relative_velocity_km_s = db.Column(db.Float)
    probability = db.Column(db.Float)
    orbit_zone = db.Column(db.String)
    notes = db.Column(db.String)
