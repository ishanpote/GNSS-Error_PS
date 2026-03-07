#!/usr/bin/env python3
"""
Application entry point.

Usage:
    python run.py
    # or with uv:
    uv run run.py

The Flask development server will start at http://127.0.0.1:5000
Open that URL in your browser to see the multi-domain UI.
"""
import sys
import os

# Make sure the repo root is on sys.path so 'backend' is importable
sys.path.insert(0, os.path.dirname(__file__))

from backend.app import create_app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
