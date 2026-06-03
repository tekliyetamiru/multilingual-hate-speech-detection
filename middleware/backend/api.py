from flask import Blueprint, jsonify, render_template_string, request
from flask_login import login_user, logout_user, login_required, current_user
from extensions import db
from models import User, BotConfig, ApiKey, Message
from werkzeug.security import generate_password_hash, check_password_hash
import json
from model import load_model, predict_toxicity
import uuid
import chapa
from models import Payment
import os
from dotenv import load_dotenv
import requests
# Initialize Chapa SDK
load_dotenv()

CHAPA_SECRET_KEY = os.environ.get('CHAPA_SECRET_KEY')

model, thresholds, label_columns, tokenizer, preprocessor = load_model()


api_bp = Blueprint('api', __name__, url_prefix='/api')

# ==================== Auth ====================
@api_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    print("Signup received:", data)
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    if not first_name:
        return jsonify({'error': 'First name is required'}), 400
    if not last_name:
        return jsonify({'error': 'Last name is required'}), 400
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    if not password:
        return jsonify({'error': 'Password is required'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    hashed = generate_password_hash(password)
    user = User(
        first_name=first_name,
        last_name=last_name,
        username=username,
        email=email,
        password=hashed
    )
    if User.query.count() == 0:
        user.role = 'admin'
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User created', 'id': user.id}), 201

@api_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    print("Login received:", data)
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password, password):
        login_user(user)
        return jsonify({'message': 'Logged in', 'role': user.role, 'username': user.username}), 200
    return jsonify({'error': 'Invalid email or password'}), 401
@api_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'}), 200

@api_bp.route('/me', methods=['GET'])
@login_required
def me():
    return jsonify({
        'id': current_user.id,
        'first_name': current_user.first_name,
        'last_name': current_user.last_name,
        'username': current_user.username,
        'email': current_user.email,
        'role': current_user.role
    })

# ==================== User ====================
@api_bp.route('/user/bots', methods=['GET'])
@login_required
def get_bots():
    bots = BotConfig.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': b.id,
        'username': b.username,
        'token': b.token,
        'status': b.status,
        'blocked_words': b.blocked_words,
        'created_at': b.created_at.isoformat()
    } for b in bots])

@api_bp.route('/user/bots', methods=['POST'])
@login_required
def create_bot():
    data = request.get_json()
    token = data.get('token')
    username = data.get('username')
    api_key_id = data.get('api_key_id')
    blocked_words = data.get('blocked_words')
    if not token or not username or not api_key_id:
        return jsonify({'error': 'Missing fields'}), 400
    api_key = ApiKey.query.get(api_key_id)
    if not api_key or api_key.user_id != current_user.id:
        return jsonify({'error': 'Invalid API key'}), 400
    bot = BotConfig(
        user_id=current_user.id,
        token=token,
        username=username,
        api_key_id=api_key_id,
        blocked_words=blocked_words
    )
    db.session.add(bot)
    db.session.commit()
    return jsonify({'id': bot.id}), 201

@api_bp.route('/user/bots/<int:bot_id>', methods=['PUT'])
@login_required
def update_bot(bot_id):
    bot = BotConfig.query.get_or_404(bot_id)
    if bot.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    if 'blocked_words' in data:
        bot.blocked_words = data['blocked_words']
    db.session.commit()
    return jsonify({'message': 'Updated'})

@api_bp.route('/user/bots/<int:bot_id>/start', methods=['POST'])
@login_required
def start_bot(bot_id):
    bot = BotConfig.query.get_or_404(bot_id)
    if bot.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    from bot import start_bot_thread
    if start_bot_thread(bot.id):
        bot.status = 'running'
        db.session.commit()
        return jsonify({'message': 'Started'})
    return jsonify({'error': 'Could not start'}), 400

@api_bp.route('/user/bots/<int:bot_id>/stop', methods=['POST'])
@login_required
def stop_bot(bot_id):
    bot = BotConfig.query.get_or_404(bot_id)
    if bot.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    from bot import stop_bot_thread
    if stop_bot_thread(bot.id):
        bot.status = 'stopped'
        db.session.commit()
        return jsonify({'message': 'Stopped'})
    return jsonify({'error': 'Not running'}), 400

@api_bp.route('/user/bots/<int:bot_id>', methods=['DELETE'])
@login_required
def delete_bot(bot_id):
    bot = BotConfig.query.get_or_404(bot_id)
    if bot.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    from bot import stop_bot_thread
    stop_bot_thread(bot.id)
    db.session.delete(bot)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

@api_bp.route('/user/api-keys', methods=['GET'])
@login_required
def get_api_keys():
    keys = ApiKey.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': k.id,
        'name': k.name,
        'key': k.key,
        'created_at': k.created_at.isoformat()
    } for k in keys])

@api_bp.route('/user/api-keys', methods=['POST'])
@login_required
def create_api_key():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name required'}), 400
    import secrets
    key = secrets.token_urlsafe(32)
    api_key = ApiKey(user_id=current_user.id, key=key, name=name)
    db.session.add(api_key)
    db.session.commit()
    return jsonify({'id': api_key.id, 'key': key}), 201

@api_bp.route('/user/api-keys/<int:key_id>', methods=['DELETE'])
@login_required
def delete_api_key(key_id):
    key = ApiKey.query.get_or_404(key_id)
    if key.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    db.session.delete(key)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

@api_bp.route('/user/messages', methods=['GET'])
@login_required
def get_messages():
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    toxic_only = request.args.get('toxic_only', 'false').lower() == 'true'
    query = Message.query.filter_by(user_id=current_user.id)
    if toxic_only:
        query = query.filter_by(is_toxic=True)
    messages = query.order_by(Message.timestamp.desc()).offset(offset).limit(limit).all()
    return jsonify([{
        'id': m.id,
        'text': m.text,
        'language': m.language,
        'probabilities': json.loads(m.probabilities) if m.probabilities else {},
        'is_toxic': m.is_toxic,
        'toxic_categories': m.toxic_categories.split(',') if m.toxic_categories else [],
        'timestamp': m.timestamp.isoformat(),
        'owner': m.owner,
        'toxicity_level': m.toxicity_level
    } for m in messages])

# ==================== Admin ====================
@api_bp.route('/admin/stats', methods=['GET'])
@login_required
def admin_stats():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    from datetime import datetime, timedelta
    total_users = User.query.count()
    total_bots = BotConfig.query.count()
    total_messages = Message.query.count()
    toxic_messages = Message.query.filter_by(is_toxic=True).count()
    today = datetime.utcnow().date()
    daily_counts = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        start = datetime.combine(day, datetime.min.time())
        end = datetime.combine(day, datetime.max.time())
        count = Message.query.filter(Message.timestamp.between(start, end)).count()
        daily_counts.append({'date': day.isoformat(), 'count': count})
    recent_msgs = Message.query.order_by(Message.timestamp.desc()).limit(10).all()
    return jsonify({
        'total_users': total_users,
        'total_bots': total_bots,
        'total_messages': total_messages,
        'toxic_messages': toxic_messages,
        'daily_counts': daily_counts,
        'recent_messages': [{
            'id': m.id,
            'timestamp': m.timestamp.isoformat(),
            'user_id': m.user_id,
            'bot_config_id': m.bot_config_id,
            'text': m.text[:50],
            'is_toxic': m.is_toxic
        } for m in recent_msgs]
    })

@api_bp.route('/admin/users', methods=['GET'])
@login_required
def admin_users():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'role': u.role,
        'created_at': u.created_at.isoformat()
    } for u in users])

@api_bp.route('/admin/users/<int:user_id>/role', methods=['PUT'])
@login_required
def toggle_role(user_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    user = User.query.get_or_404(user_id)
    # Prevent removing the only admin
    if user.role == 'admin' and User.query.filter_by(role='admin').count() == 1:
        return jsonify({'error': 'Cannot remove the only admin'}), 400
    user.role = 'user' if user.role == 'admin' else 'admin'
    db.session.commit()
    return jsonify({'message': 'Role updated'})

@api_bp.route('/admin/messages', methods=['GET'])
@login_required
def admin_messages():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    messages = Message.query.order_by(Message.timestamp.desc()).offset(offset).limit(limit).all()
    return jsonify([{
        'id': m.id,
        'text': m.text,
        'language': m.language,
        'probabilities': json.loads(m.probabilities) if m.probabilities else {},
        'is_toxic': m.is_toxic,
        'toxic_categories': m.toxic_categories.split(',') if m.toxic_categories else [],
        'timestamp': m.timestamp.isoformat(),
        'user_id': m.user_id,
        'bot_config_id': m.bot_config_id
    } for m in messages])

# ==================== Registration in app.py ====================
# In app.py, after creating the app, register the blueprint:
# from api import api_bp
# app.register_blueprint(api_bp)


# ==================== Additional User Features ====================
@api_bp.route('/user/bot-stats', methods=['GET'])
@login_required
def bot_stats():
    bots = BotConfig.query.filter_by(user_id=current_user.id).all()
    stats = []
    for bot in bots:
        msg_count = Message.query.filter_by(bot_config_id=bot.id).count()
        toxic_count = Message.query.filter_by(bot_config_id=bot.id, is_toxic=True).count()
        stats.append({
            'bot_id': bot.id,
            'username': bot.username,
            'message_count': msg_count,
            'toxic_count': toxic_count,
            'toxic_rate': (toxic_count / msg_count * 100) if msg_count > 0 else 0
        })
    return jsonify(stats)

@api_bp.route('/user/export-logs', methods=['GET'])
@login_required
def export_logs():
    import csv
    from io import StringIO
    from flask import Response
    messages = Message.query.filter_by(user_id=current_user.id).order_by(Message.timestamp).all()
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(['timestamp', 'text', 'language', 'is_toxic', 'toxic_categories'])
    for m in messages:
        cw.writerow([m.timestamp, m.text, m.language, m.is_toxic, m.toxic_categories])
    output = si.getvalue()
    return Response(output, mimetype='text/csv', headers={'Content-Disposition': 'attachment;filename=logs.csv'})

# ==================== Additional Admin Features ====================
@api_bp.route('/admin/system-health', methods=['GET'])
@login_required
def system_health():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    import psutil
    return jsonify({
        'cpu_percent': psutil.cpu_percent(interval=1),
        'memory_percent': psutil.virtual_memory().percent,
        'disk_usage': psutil.disk_usage('/').percent
    })

@api_bp.route('/admin/activity-heatmap', methods=['GET'])
@login_required
def activity_heatmap():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    from datetime import datetime, timedelta
    # Last 7 days, hourly breakdown
    heatmap = []
    for i in range(7):
        day = datetime.utcnow().date() - timedelta(days=i)
        hour_counts = []
        for hour in range(24):
            start = datetime.combine(day, datetime.min.time().replace(hour=hour))
            end = start + timedelta(hours=1)
            count = Message.query.filter(Message.timestamp.between(start, end)).count()
            hour_counts.append(count)
        heatmap.append({'date': day.isoformat(), 'hours': hour_counts})
    return jsonify(heatmap)

@api_bp.route('/admin/global-thresholds', methods=['GET', 'PUT'])
@login_required
def global_thresholds():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    # Store thresholds in a new table or a simple config file
    # For simplicity, use a JSON file
    import json, os
    config_file = 'global_config.json'
    if request.method == 'GET':
        if os.path.exists(config_file):
            with open(config_file) as f:
                data = json.load(f)
        else:
            data = {'thresholds': [0.75, 0.75, 0.75, 0.75, 0.75, 0.75]}
        return jsonify(data)
    else:
        data = request.get_json()
        with open(config_file, 'w') as f:
            json.dump(data, f)
        return jsonify({'message': 'Updated'})

@api_bp.route('/admin/announcements', methods=['GET', 'POST'])
@login_required
def announcements():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    import json, os
    ann_file = 'announcements.json'
    if request.method == 'GET':
        if os.path.exists(ann_file):
            with open(ann_file) as f:
                data = json.load(f)
        else:
            data = {'announcements': []}
        return jsonify(data)
    else:
        data = request.get_json()
        with open(ann_file, 'w') as f:
            json.dump(data, f)
        return jsonify({'message': 'Posted'})

@api_bp.route('/admin/audit-logs', methods=['GET'])
@login_required
def audit_logs():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    # For demonstration, return recent admin actions (you'd need to log them)
    # Placeholder
    return jsonify({'logs': []})

@api_bp.route('/user/message-trend', methods=['GET'])
@login_required
def message_trend():
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()
    labels = []
    counts = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        start = datetime.combine(day, datetime.min.time())
        end = datetime.combine(day, datetime.max.time())
        count = Message.query.filter(Message.user_id == current_user.id, Message.timestamp.between(start, end)).count()
        labels.append(day.strftime('%Y-%m-%d'))
        counts.append(count)
    return jsonify({'labels': labels, 'counts': counts})



@api_bp.route('/announcements', methods=['GET'])
def get_announcements():
    import json, os
    ann_file = 'announcements.json'
    if os.path.exists(ann_file):
        with open(ann_file) as f:
            data = json.load(f)
    else:
        data = {'announcements': []}
    return jsonify(data)



# ==================== Admin User Management ====================
@api_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@login_required
def admin_delete_user(user_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    user = User.query.get_or_404(user_id)
    # Prevent deleting the only admin
    if user.role == 'admin' and User.query.filter_by(role='admin').count() == 1:
        return jsonify({'error': 'Cannot delete the only admin'}), 400
    # Delete associated bots and messages will cascade
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'})

@api_bp.route('/admin/users/<int:user_id>/reset-keys', methods=['POST'])
@login_required
def admin_reset_user_keys(user_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    user = User.query.get_or_404(user_id)
    # Delete all API keys for this user
    ApiKey.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'API keys reset'})

@api_bp.route('/admin/users/<int:user_id>/messages', methods=['GET'])
@login_required
def admin_user_messages(user_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    messages = Message.query.filter_by(user_id=user_id).order_by(Message.timestamp.desc()).offset(offset).limit(limit).all()
    return jsonify([{
        'id': m.id,
        'text': m.text,
        'language': m.language,
        'is_toxic': m.is_toxic,
        'toxic_categories': m.toxic_categories.split(',') if m.toxic_categories else [],
        'timestamp': m.timestamp.isoformat(),
        'owner': m.owner,
        'toxicity_level': m.toxicity_level
    } for m in messages])

# ==================== Admin Enhanced Analytics ====================
@api_bp.route('/admin/analytics', methods=['GET'])
@login_required
def admin_analytics():
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    total_messages = Message.query.count()
    toxic_messages = Message.query.filter_by(is_toxic=True).count()
    non_toxic = total_messages - toxic_messages
    
    # Per-user stats
    users = User.query.all()
    user_stats = []
    for u in users:
        user_msgs = Message.query.filter_by(user_id=u.id).count()
        user_toxic = Message.query.filter_by(user_id=u.id, is_toxic=True).count()
        user_stats.append({
            'user_id': u.id,
            'username': u.username,
            'total_messages': user_msgs,
            'toxic_messages': user_toxic,
            'toxic_rate': (user_toxic / user_msgs * 100) if user_msgs > 0 else 0
        })
    # Sort by toxic rate desc
    user_stats.sort(key=lambda x: x['toxic_rate'], reverse=True)
    
    # Top toxic users (limit 10)
    top_toxic_users = user_stats[:10]
    
    # Daily trend (last 30 days)
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()
    daily_trend = []
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        start = datetime.combine(day, datetime.min.time())
        end = datetime.combine(day, datetime.max.time())
        count = Message.query.filter(Message.timestamp.between(start, end)).count()
        toxic_count = Message.query.filter(Message.timestamp.between(start, end), Message.is_toxic == True).count()
        daily_trend.append({
            'date': day.isoformat(),
            'total': count,
            'toxic': toxic_count
        })
    
    return jsonify({
        'total_messages': total_messages,
        'toxic_messages': toxic_messages,
        'non_toxic': non_toxic,
        'top_toxic_users': top_toxic_users,
        'daily_trend': daily_trend
    })

@api_bp.route('/user/credits', methods=['GET'])
@login_required
def get_credits():
    return jsonify({'credits': current_user.credits})

@api_bp.route('/user/add-credits', methods=['POST'])
@login_required
def add_credits():
    data = request.get_json()
    amount = data.get('amount', 0)
    # In production, verify payment here
    current_user.credits += amount
    db.session.commit()
    return jsonify({'credits': current_user.credits})


@api_bp.route('/admin/users/<int:user_id>/credits', methods=['PUT'])
@login_required
def admin_set_credits(user_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    user.credits = data.get('credits', 0)
    db.session.commit()
    return jsonify({'message': 'Credits updated'})

@api_bp.route('/predict', methods=['POST'])
def predict():
    """Public endpoint for demo – returns toxicity prediction for a single text."""
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    from model import predict_toxicity
    result = predict_toxicity(text, model, thresholds, label_columns, tokenizer, preprocessor)
    # Remove internal fields if any
    return jsonify({
        'language': result['language'],
        'probabilities': result['probabilities'],
        'is_toxic': result['is_toxic'],
        'toxic_categories': result['toxic_categories']
    })


# Initialize Chapa only if secret key is provided
if CHAPA_SECRET_KEY:
    try:
        from chapa import Chapa
        chapa = Chapa(CHAPA_SECRET_KEY)
        print("Chapa initialized in test/live mode")
    except ImportError:
        print("Chapa library not installed. Payment will not work.")
        chapa = None
else:
    print("CHAPA_SECRET_KEY not set. Payment disabled.")
    chapa = None

@api_bp.route('/user/create-payment', methods=['POST'])
@login_required
def create_payment():
    if chapa is None:
        return jsonify({'error': 'Payment system not configured. Please contact support.'}), 500

    data = request.get_json()
    amount = data.get('amount')
    phone_number = data.get('phone_number')
    if not amount:
        return jsonify({'error': 'Amount is required'}), 400
    if not phone_number:
        return jsonify({'error': 'Phone number is required'}), 400

    if not (len(phone_number) == 10 and phone_number.startswith(('09', '07'))):
        return jsonify({'error': 'Phone number must be 10 digits and start with 09 or 07'}), 400

    packages = {100: 1000, 1000: 11000, 10000: 120000}
    if amount not in packages:
        return jsonify({'error': 'Invalid amount'}), 400

    credits = packages[amount]
    tx_ref = f"toxiguard-{current_user.id}-{uuid.uuid4().hex[:8]}"

    try:
        response = chapa.initialize(
            email=current_user.email,
            amount=amount,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            phone_number=phone_number,
            tx_ref=tx_ref,
            # callback_url not needed – we use return_url only
            return_url=f"http://localhost:5000/api/payment-return?tx_ref={tx_ref}",
            customization={
                "title": "ToxiGuard",
                "description": f"Purchase {credits} credits"
            }
        )
        print(f"Chapa response: {response}")
    except Exception as e:
        print(f"Chapa error: {e}")
        return jsonify({'error': str(e)}), 500

    if response.get('status') == 'success':
        checkout_url = response.get('data', {}).get('checkout_url')
        if not checkout_url:
            return jsonify({'error': 'No checkout URL in response'}), 500
    else:
        error_msg = response.get('message', 'Unknown error from Chapa')
        print(f"Chapa returned error: {error_msg}")
        return jsonify({'error': error_msg}), 500

    payment = Payment(
        user_id=current_user.id,
        amount=amount,
        credits=credits,
        tx_ref=tx_ref,
        status='pending'
    )
    db.session.add(payment)
    db.session.commit()

    return jsonify({'checkout_url': checkout_url})

    from flask import render_template_string

@api_bp.route('/payment-return', methods=['GET'])
def payment_return():
    tx_ref = request.args.get('tx_ref')
    if not tx_ref:
        return "Missing transaction reference", 400

    payment = Payment.query.filter_by(tx_ref=tx_ref).first()
    if not payment:
        return "Invalid transaction", 400

    # Verify with Chapa
    try:
        verification = chapa.verify(tx_ref)
    except Exception as e:
        print(f"Verification error: {e}")
        return "Verification failed", 500

    if verification.get('status') == 'success':
        user = User.query.get(payment.user_id)
        user.credits += payment.credits
        payment.status = 'success'
        db.session.commit()
        # Show a receipt page that redirects after 10 seconds
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="refresh" content="10;url=http://localhost:3000/user/dashboard?payment=success">
            <title>Payment Successful</title>
            <style>
                body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                .container {{ max-width: 500px; margin: auto; }}
                .checkmark {{ color: green; font-size: 80px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="checkmark">✓</div>
                <h1>Payment Successful!</h1>
                <p>You purchased <strong>{payment.credits}</strong> credits.</p>
                <p>Your new credit balance: <strong>{user.credits}</strong></p>
                <p>You will be redirected to your dashboard in 10 seconds.</p>
                <p>If not redirected, <a href="http://localhost:3000/user/dashboard?payment=success">click here</a>.</p>
            </div>
        </body>
        </html>
        """
        return render_template_string(html)
    else:
        payment.status = 'failed'
        db.session.commit()
        # Show a failure page that redirects after 10 seconds
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="refresh" content="10;url=http://localhost:3000/user/dashboard?payment=failed">
            <title>Payment Failed</title>
            <style>
                body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                .cross {{ color: red; font-size: 80px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="cross">✗</div>
                <h1>Payment Failed</h1>
                <p>Unfortunately, your transaction could not be completed.</p>
                <p>You will be redirected back to the dashboard in 10 seconds.</p>
                <p>If not redirected, <a href="http://localhost:3000/user/dashboard?payment=failed">click here</a>.</p>
            </div>
        </body>
        </html>
        """
        return render_template_string(html)

@api_bp.route('/social-media/check', methods=['POST'])
def social_media_check():
    """Called by social media app to check text toxicity using an API key."""
    data = request.get_json()
    text = data.get('text')
    api_key = data.get('api_key')
    content_type = data.get('content_type', 'message')  # 'post', 'message', 'comment'

    if not text or not api_key:
        return jsonify({'error': 'Missing text or api_key'}), 400

    # Validate API key
    api_key_record = ApiKey.query.filter_by(key=api_key).first()
    if not api_key_record:
        return jsonify({'error': 'Invalid API key'}), 401

    user = User.query.get(api_key_record.user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 401

    # Check credits
    if user.credits <= 0:
        return jsonify({
            'error': 'Insufficient credits',
            'credits_remaining': 0,
            'message': 'Please purchase more credits to continue moderation.'
        }), 403

    # Deduct 1 credit per check
    user.credits -= 1
    db.session.commit()

    # Run toxicity detection
    result = predict_toxicity(text, model, thresholds, label_columns, tokenizer, preprocessor)

    # Log this check (optional, for analytics)
    # We can create a SocialMediaLog table if needed, but for now we reuse Message table? 
    # We'll create a separate log for social media checks to avoid mixing with Telegram logs.
    # For simplicity, we'll just return the result. Later we can add logging.

    return jsonify({
        'is_toxic': result['is_toxic'],
        'toxic_categories': result['toxic_categories'],
        'probabilities': result['probabilities'],
        'language': result['language'],
        'credits_remaining': user.credits,
        'warning_message': "⚠️ Your content has been detected as toxic and will not be shared." if result['is_toxic'] else None
    })