from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Conjunction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    object1_id = db.Column(db.Integer)
    object1_name = db.Column(db.String)
    object1_type = db.Column(db.String)
    object1_satnum = db.Column(db.Integer)
    object2_id = db.Column(db.Integer)
    object2_name = db.Column(db.String)
    object2_type = db.Column(db.String)
    object2_satnum = db.Column(db.Integer)
    detected_at = db.Column(db.DateTime)
    conjunction_time = db.Column(db.DateTime)
    closest_distance_km = db.Column(db.Float)
    object1_velocity_km_s = db.Column(db.Float)
    object2_velocity_km_s = db.Column(db.Float)
    relative_velocity_km_s = db.Column(db.Float)
    probability = db.Column(db.Float)
    orbit_zone = db.Column(db.String)
    notes = db.Column(db.String)

class ManeuverPlan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    conjunction_id = db.Column(db.Integer, db.ForeignKey('conjunction.id'), nullable=False)
    object_id = db.Column(db.Integer, nullable=False)
    maneuver_type = db.Column(db.String(50), nullable=False)
    delta_v = db.Column(db.Float, nullable=False)  # m/s
    execution_time = db.Column(db.DateTime, nullable=False)
    expected_miss_distance = db.Column(db.Float, nullable=False)  # km
    fuel_cost = db.Column(db.Float, nullable=False)  # kg
    risk_reduction = db.Column(db.Float, nullable=False)  # percent
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'conjunction_id': self.conjunction_id,
            'object_id': self.object_id,
            'maneuver_type': self.maneuver_type,
            'delta_v': self.delta_v,
            'execution_time': self.execution_time.isoformat(),
            'expected_miss_distance': self.expected_miss_distance,
            'fuel_cost': self.fuel_cost,
            'risk_reduction': self.risk_reduction,
            'generated_at': self.generated_at.isoformat()
        }