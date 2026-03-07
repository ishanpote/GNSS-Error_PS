from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
import os
import pandas as pd
import numpy as np
from gnss_predictor import GNSSPredictor

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gnss.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
db = SQLAlchemy(app)
jwt = JWTManager(app)

# JWT Error Handlers
@jwt.invalid_token_loader
def invalid_token_callback(error):
    print(f"DEBUG: Invalid token - {error}")
    return jsonify({'error': 'Invalid token', 'message': str(error)}), 401

@jwt.unauthorized_loader
def unauthorized_callback(error):
    print(f"DEBUG: Unauthorized - {error}")
    return jsonify({'error': 'Missing authorization header', 'message': str(error)}), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    print(f"DEBUG: Expired token - header: {jwt_header}, payload: {jwt_payload}")
    return jsonify({'error': 'Token has expired'}), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    print(f"DEBUG: Revoked token - header: {jwt_header}, payload: {jwt_payload}")
    return jsonify({'error': 'Token has been revoked'}), 401

# Request logging for debugging
@app.before_request
def log_request():
    if request.path.startswith('/api'):
        print(f"\n=== REQUEST: {request.method} {request.path} ===")
        print(f"Headers: {dict(request.headers)}")
        auth_header = request.headers.get('Authorization')
        if auth_header:
            print(f"Authorization Header Present: {auth_header[:50]}...")
        else:
            print("NO Authorization Header!")
        print("=" * 50)
    import sys
    sys.stdout.flush()

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # admin, user
    category = db.Column(db.String(50), nullable=True)  # defence, aviation, telecommunication
    created_at = db.Column(db.DateTime, default=db.func.now())

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'category': self.category
        }

# Create tables
with app.app_context():
    db.create_all()
    # Create default admin user if not exists
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            username='admin',
            email='admin@gnss.com',
            role='admin',
            category=None
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print("Default admin user created: username='admin', password='admin123'")

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        category = data.get('category')  # defence, aviation, telecommunication

        if not username or not email or not password:
            return jsonify({'error': 'Missing required fields'}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400

        user = User(
            username=username,
            email=email,
            role='user',
            category=category
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'error': 'Missing username or password'}), 400

        user = User.query.filter_by(username=username).first()

        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid username or password'}), 401

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'role': user.role,
                'category': user.category
            }
        )

        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'user': user.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Dashboard Access Control
def check_dashboard_access(dashboard_type):
    """Check if user has access to the requested dashboard"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return False
    
    # Admin can access all dashboards
    if user.role == 'admin':
        return True

    # Everyone can access general dashboard
    if dashboard_type == 'general':
        return True

    # Users can only access their category dashboard
    if dashboard_type == user.category:
        return True

    return False


@app.route('/api/dashboard/<dashboard_type>', methods=['GET'])
@jwt_required()
def get_dashboard_data(dashboard_type):
    """Get dashboard data based on type"""
    try:
        if not check_dashboard_access(dashboard_type):
            return jsonify({'error': 'Access denied to this dashboard'}), 403

        # This will be populated with actual data from GNSS predictions
        # For now, returning mock data structure
        dashboard_data = {
            'type': dashboard_type,
            'accessible': True,
            'message': f'Dashboard data for {dashboard_type}'
        }

        return jsonify(dashboard_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/dashboard/access', methods=['GET'])
@jwt_required()
def get_user_access():
    """Get list of dashboards user can access"""
    try:
        # Debug: Print authorization header
        auth_header = request.headers.get('Authorization', 'No Authorization header')
        print(f"DEBUG get_user_access: Authorization header: {auth_header}")
        
        user_id = int(get_jwt_identity())
        print(f"DEBUG: User ID from JWT: {user_id}, type: {type(user_id)}")
        user = User.query.get(user_id)
        print(f"DEBUG: User query result: {user}")
        
        if not user:
            return jsonify({'error': 'User not found'}), 404

        accessible_dashboards = ['general']

        if user.role == 'admin':
            accessible_dashboards.extend(['defence', 'aviation', 'telecommunication'])
        elif user.category:
            accessible_dashboards.append(user.category)

        return jsonify({
            'dashboards': accessible_dashboards,
            'role': user.role,
            'category': user.category
        }), 200

    except Exception as e:
        print(f"DEBUG: Exception in get_user_access: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200


# GNSS Prediction Endpoints
predictor = None

def get_predictor():
    """Lazy load the predictor"""
    global predictor
    if predictor is None:
        predictor = GNSSPredictor(
            model_dir=os.path.join(os.path.dirname(__file__), '..', 'model'),
            scaler_dir=os.path.join(os.path.dirname(__file__), '..', 'scaler')
        )
        predictor.load_models()
    return predictor


@app.route('/api/predict', methods=['POST'])
@jwt_required()
def predict():
    """Make GNSS predictions"""
    import time
    start_time = time.time()
    
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get parameters
        n_past_days = int(request.form.get('n_past_days', 7))
        n_future_days = int(request.form.get('n_future_days', 1))
        points_per_day = int(request.form.get('points_per_day', 41))
        
        # Read CSV
        df = pd.read_csv(file)
        
        # Validate columns
        required_cols = ['x_error(m)', 'y_error(m)', 'z_error(m)', 'satclockerror(m)']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return jsonify({'error': f'Missing columns: {missing}'}), 400
        
        # Get predictor and make predictions
        pred = get_predictor()
        results = pred.predict_and_format(df, n_past_days, n_future_days, points_per_day)
        
        # Calculate statistics
        predictions_array = np.array([[
            r['x_error(m)'], 
            r['y_error(m)'], 
            r['z_error(m)'], 
            r['satclockerror(m)']
        ] for r in results])
        
        avg_errors = {
            'x_error': float(np.mean(predictions_array[:, 0])),
            'y_error': float(np.mean(predictions_array[:, 1])),
            'z_error': float(np.mean(predictions_array[:, 2])),
            'clock_error': float(np.mean(predictions_array[:, 3]))
        }
        
        max_errors = {
            'max_x': float(np.max(np.abs(predictions_array[:, 0]))),
            'max_y': float(np.max(np.abs(predictions_array[:, 1]))),
            'max_z': float(np.max(np.abs(predictions_array[:, 2]))),
            'max_clock': float(np.max(np.abs(predictions_array[:, 3])))
        }
        
        # Calculate total 3D position error
        total_3d_error = float(np.mean(np.sqrt(
            predictions_array[:, 0]**2 + 
            predictions_array[:, 1]**2 + 
            predictions_array[:, 2]**2
        )))
        
        # Get historical data (last 2 days or all available data)
        historical_data = []
        if 'utc_time' in df.columns:
            try:
                # Parse datetime if it's a string
                df['utc_time'] = pd.to_datetime(df['utc_time'])
                # Get last 2 days of data
                df_sorted = df.sort_values('utc_time', ascending=False)
                last_2_days = df_sorted.head(2 * points_per_day)  # 2 days worth of data
                
                for _, row in last_2_days.iterrows():
                    historical_data.append({
                        'utc_time': row['utc_time'].isoformat() if hasattr(row['utc_time'], 'isoformat') else str(row['utc_time']),
                        'x_error(m)': float(row['x_error(m)']),
                        'y_error(m)': float(row['y_error(m)']),
                        'z_error(m)': float(row['z_error(m)']),
                        'satclockerror(m)': float(row['satclockerror(m)'])
                    })
            except Exception as hist_error:
                print(f"Warning: Could not process historical data: {hist_error}")
                # Continue without historical data if there's an error
                historical_data = []
        
        processing_time = round(time.time() - start_time, 2)
        
        return jsonify({
            'predictions': results,
            'n_predictions': len(results),
            'statistics': {
                'average_errors': avg_errors,
                'maximum_errors': max_errors,
                'total_3d_error': total_3d_error
            },
            'historical_data': historical_data,
            'processing_time': processing_time
        }), 200
        
    except Exception as e:
        import traceback
        print(f"ERROR in predict endpoint: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/api/predict/sample', methods=['GET'])
@jwt_required()
def get_sample_predictions():
    """Get sample prediction data for visualization"""
    try:
        # Generate sample data for demonstration
        n_points = 41  # 1 day of data
        timestamps = pd.date_range(start='2024-01-01', periods=n_points, freq='15min')
        
        # Generate synthetic data
        np.random.seed(42)
        data = {
            'utc_time': [t.isoformat() for t in timestamps],
            'x_error(m)': np.random.randn(n_points) * 0.5,
            'y_error(m)': np.random.randn(n_points) * 0.5,
            'z_error(m)': np.random.randn(n_points) * 0.5,
            'satclockerror(m)': np.random.randn(n_points) * 0.3,
        }
        
        return jsonify(data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/analytics/<dashboard_type>', methods=['GET'])
@jwt_required()
def get_analytics(dashboard_type):
    """Get analytics data for specific dashboard"""
    try:
        if not check_dashboard_access(dashboard_type):
            return jsonify({'error': 'Access denied to this dashboard'}), 403
        
        # Generate sample analytics data
        # In production, this would fetch real data based on dashboard_type
        np.random.seed(hash(dashboard_type) % 2**32)
        
        analytics = {
            'summary': {
                'total_predictions': np.random.randint(1000, 10000),
                'avg_error': round(np.random.uniform(0.1, 0.5), 3),
                'accuracy': round(np.random.uniform(85, 98), 2),
                'active_satellites': np.random.randint(15, 30)
            },
            'error_distribution': {
                'x_error': {
                    'mean': round(np.random.randn() * 0.2, 3),
                    'std': round(abs(np.random.randn() * 0.1), 3),
                    'max': round(abs(np.random.randn() * 0.5), 3),
                    'min': round(-abs(np.random.randn() * 0.5), 3)
                },
                'y_error': {
                    'mean': round(np.random.randn() * 0.2, 3),
                    'std': round(abs(np.random.randn() * 0.1), 3),
                    'max': round(abs(np.random.randn() * 0.5), 3),
                    'min': round(-abs(np.random.randn() * 0.5), 3)
                },
                'z_error': {
                    'mean': round(np.random.randn() * 0.2, 3),
                    'std': round(abs(np.random.randn() * 0.1), 3),
                    'max': round(abs(np.random.randn() * 0.5), 3),
                    'min': round(-abs(np.random.randn() * 0.5), 3)
                }
            },
            'time_series': [
                {
                    'timestamp': (pd.Timestamp('2024-01-01') + pd.Timedelta(hours=i)).isoformat(),
                    'error': round(abs(np.random.randn() * 0.3), 3)
                }
                for i in range(24)
            ],
            'model_performance': {
                'GRU': round(np.random.uniform(85, 95), 2),
                'biGRU': round(np.random.uniform(85, 95), 2),
                'LSTM': round(np.random.uniform(85, 95), 2),
                'biLSTM': round(np.random.uniform(85, 95), 2),
                'Transformer': round(np.random.uniform(85, 95), 2)
            }
        }
        
        return jsonify(analytics), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
