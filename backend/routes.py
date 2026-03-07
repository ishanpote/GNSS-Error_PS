"""Flask API routes for the GNSS Error Prediction service."""
from flask import Blueprint, request, jsonify, Response
from .services.prediction_service import run_prediction

api = Blueprint("api", __name__)


@api.route("/health", methods=["GET"])
def health():
    """Simple liveness probe."""
    return jsonify({"status": "ok", "service": "GNSS Error Prediction API"})


@api.route("/predict", methods=["POST"])
def predict():
    """
    POST /api/predict
    Form fields:
        file         (required) – CSV file upload
        n_past_days  (optional, default 7)
        n_future_days (optional, default 1)
        domain       (optional, default "general")  – "defense" | "aviation" | "telecommunication"

    Returns JSON:
        {
          "status": "ok" | "error",
          "message": "...",
          "preview_rows": [...],   // first 200 rows as list-of-dicts
          "domain": "...",
        }
    """
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file part in request."}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"status": "error", "message": "No file selected."}), 400

    try:
        n_past_days = int(request.form.get("n_past_days", 7))
        n_future_days = int(request.form.get("n_future_days", 1))
    except ValueError:
        return jsonify({"status": "error", "message": "n_past_days and n_future_days must be integers."}), 400

    domain = request.form.get("domain", "general")
    csv_bytes = f.read()

    result = run_prediction(
        csv_bytes=csv_bytes,
        n_past_days=n_past_days,
        n_future_days=n_future_days,
        domain=domain,
    )

    if result["status"] == "error":
        return jsonify(result), 422

    # Return JSON by default; CSV download is handled by a separate endpoint
    return jsonify({
        "status": result["status"],
        "message": result["message"],
        "preview_rows": result.get("preview_rows", []),
        "domain": result["domain"],
    })


@api.route("/predict/download", methods=["POST"])
def predict_download():
    """
    Same as /predict but returns a CSV file as a download attachment.
    Accepts the same form fields as /predict.
    """
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file part in request."}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"status": "error", "message": "No file selected."}), 400

    try:
        n_past_days = int(request.form.get("n_past_days", 7))
        n_future_days = int(request.form.get("n_future_days", 1))
    except ValueError:
        return jsonify({"status": "error", "message": "n_past_days and n_future_days must be integers."}), 400

    domain = request.form.get("domain", "general")
    csv_bytes = f.read()

    result = run_prediction(
        csv_bytes=csv_bytes,
        n_past_days=n_past_days,
        n_future_days=n_future_days,
        domain=domain,
    )

    if result["status"] == "error":
        return jsonify(result), 422

    return Response(
        result["csv"],
        mimetype="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=gnss_predictions_{domain}.csv"
        },
    )
