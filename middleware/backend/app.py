import time
from flask import Flask, jsonify, request, redirect, url_for
from extensions import db, login_manager, csrf
from models import User
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'info'
    csrf.init_app(app)

    # CORS: allow frontend origin and credentials
    CORS(app, origins=['http://localhost:3000'], supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'])

    # Custom unauthorized handler: return JSON for API routes
    @login_manager.unauthorized_handler
    def unauthorized():
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Unauthorized'}), 401
        return redirect(url_for('auth.login'))

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # Register blueprints
    from auth import auth_bp
    from user import user_bp
    from admin import admin_bp
    from api import api_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(api_bp)
    csrf.exempt(api_bp)

    @app.route('/')
    def index():
        return jsonify({'message': 'ToxiGuard API is running'}), 200

    with app.app_context():
        db.create_all()
        # Restart bots only in the main process (not the reloader)
        import os
        if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
            # Now we can safely query the database and start bots
            from bot import start_bot_thread
            from models import BotConfig
            running_bots = BotConfig.query.filter_by(status='running').all()
            for bot in running_bots:
                print(f"Restarting bot {bot.username} (id={bot.id})")
                start_bot_thread(bot.id)
                time.sleep(2)

    return app

if __name__ == '__main__':
    app = create_app()
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    app.run(debug=True, port=5000)