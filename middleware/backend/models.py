from datetime import datetime
from flask_login import UserMixin
from extensions import db

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    first_name = db.Column(db.String(50), nullable=False, default='')
    last_name = db.Column(db.String(50), nullable=False, default='')
    password = db.Column(db.String(60), nullable=False)
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    bots = db.relationship('BotConfig', backref='owner', lazy=True, cascade='all, delete-orphan')
    api_keys = db.relationship('ApiKey', backref='user', lazy=True, cascade='all, delete-orphan')
    credits = db.Column(db.Integer, default=100, nullable=False)
class BotConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(100), nullable=False)
    api_key_id = db.Column(db.Integer, db.ForeignKey('api_key.id'), nullable=True)
    status = db.Column(db.String(20), default='stopped')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_error = db.Column(db.Text, nullable=True)
    blocked_words = db.Column(db.Text, nullable=True)

class ApiKey(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    key = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    bot_config_id = db.Column(db.Integer, db.ForeignKey('bot_config.id'), nullable=True)
    text = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(10), nullable=True)
    probabilities = db.Column(db.Text, nullable=True)   # JSON string
    is_toxic = db.Column(db.Boolean, default=False)
    toxic_categories = db.Column(db.Text, nullable=True)  # comma-separated
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    action_taken = db.Column(db.String(50), nullable=True)
    owner = db.Column(db.String(100), nullable=True)  # Telegram username
    toxicity_level = db.Column(db.Float, default=0.0)  # Max probability    
    
    bot_config = db.relationship('BotConfig', backref='messages', lazy=True)


class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)  # amount in ETB
    credits = db.Column(db.Integer, nullable=False)  # credits purchased
    tx_ref = db.Column(db.String(100), unique=True, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, success, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)