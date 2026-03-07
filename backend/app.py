"""Flask application factory and entry point."""
import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from .routes import api


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)

    # Allow the frontend (any origin during development) to call the API.
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register the API blueprint under /api
    app.register_blueprint(api, url_prefix="/api")

    # Serve the static frontend (HTML/CSS/JS) from the sibling frontend/ directory
    frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")

    @app.route("/")
    def index():
        return send_from_directory(frontend_dir, "index.html")

    @app.route("/<path:filename>")
    def static_files(filename):
        return send_from_directory(frontend_dir, filename)

    return app


if __name__ == "__main__":
    application = create_app()
    application.run(debug=True, host="0.0.0.0", port=5000)
