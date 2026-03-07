# GNSS-Error_PS — 15‑Minute GNSS Error Forecasting (Ensemble + Streamlit)

This repository contains a **time-series forecasting application** for predicting GNSS error components at **15‑minute resolution** using an **ensemble (voting average)** of multiple deep-learning models (GRU/biGRU/LSTM/biLSTM/Transformer, optionally N‑BEATS and Gaussian Process variants depending on the app script).

The Streamlit app takes a CSV containing recent GNSS error history (multiple days) and generates **future predictions** that you can **download as a CSV**.

---

## What this project does

Given historical GNSS error signals:

- `x_error(m)`
- `y_error(m)`
- `z_error(m)`
- `satclockerror(m)`

sampled at **15-minute intervals** (configured in the app as **41 points/day**), the app:

1. **Scales** the input using a pre-fitted scaler (`scaler/scaler.pkl`)
2. Builds rolling sequences using the last **N past days** (default: 7)
3. Loads pre-trained models from the `model/` directory
4. Runs each model to forecast **N future days** (default: 1)
5. **Averages predictions across models** (simple ensemble voting average)
6. Inverse-transforms predictions back to meters
7. Generates a future `utc_time` column and allows download

---

## Repository layout

```text
.
├── app.py                    # Streamlit app (ensemble + optional GP) with progress UI
├── app_withn-beats.py         # Streamlit app variant that also supports N-BEATS
├── test.py                   # Another Streamlit app variant / experimentation script
├── main.py                   # Minimal entrypoint (prints hello)
├── pyproject.toml            # Project metadata (uses Python >=3.13)
├── .python-version           # Python version pin (3.13)
├── uv.lock                   # uv lockfile
├── original_uploaded_file.csv.csv   # Example / uploaded CSV (as committed)
├── model/
│   ├── 15min-best_gru_model_with_timesereas split.pth
│   ├── 15min-best_bigru_model_with_timesereas split.pth
│   ├── 15min-best_lstm_model.pth
│   ├── 15min-best_bilstm_model_with_timesereas split.pth
│   ├── 15min-best_transformars_model_with_timesereas split.pth
│   ├── 15min-best_NBEATS_model.pth
│   └── .gitattributes
└── scaler/
    └── scaler.pkl
```

> Note: `app.py` and `app_withn-beats.py` refer to additional files such as `model/GP_models.pkl` and `model/scaler_gp.pkl`. Those are loaded **only if present**.

---

## Requirements

### Python
- Python **3.13** (see `.python-version`)

### Core dependencies (observed in code)
- `streamlit`
- `pandas`
- `numpy`
- `torch`
- `joblib`
- `scikit-learn` (indirectly required to load/execute the scaler)

`pyproject.toml` currently lists only `torch`, so if you run this locally you will likely need to install the missing runtime dependencies as well (see instructions below).

---

## Quickstart (run the Streamlit app)

### 1) Create an environment

Using `uv` (recommended if you already use it):

```bash
uv venv
uv pip install -r requirements.txt
```

This repo does not currently include a `requirements.txt`, so you can install directly:

```bash
uv pip install streamlit pandas numpy torch joblib scikit-learn
```

Or with `pip`:

```bash
python -m venv .venv
source .venv/bin/activate   # (macOS/Linux)
# .venv\Scripts\activate    # (Windows)
pip install streamlit pandas numpy torch joblib scikit-learn
```

### 2) Run the app

Main app:

```bash
streamlit run app.py
```

N‑BEATS variant:

```bash
streamlit run app_withn-beats.py
```

---

## Input CSV format

Upload a CSV containing at least these columns:

- `utc_time` (timestamp or string; the app parses it to generate future timestamps)
- `x_error(m)`
- `y_error(m)`
- `z_error(m)`
- `satclockerror(m)`

### Data expectations
- The app assumes **15-minute resolution**.
- It uses `points_per_day = 41` in `app.py` (fixed).  
  (This is treated as the number of samples per day in the model pipeline.)
- Default history window is **7 days**, so you need at least:

```
rows_required = n_past_days * points_per_day
              = 7 * 41
              = 287 rows minimum
```

If you provide fewer rows than required, the app will stop with an error.

---

## Output format

The downloaded output CSV includes:

- `utc_time` (future timestamps at 15-minute intervals)
- predicted values for:
  - `x_error(m)`
  - `y_error(m)`
  - `z_error(m)`
  - `satclockerror(m)`

---

## Models included

The `model/` directory contains PyTorch `.pth` weights for (at least):

- GRU
- biGRU
- LSTM
- biLSTM
- Transformer
- N‑BEATS (used by `app_withn-beats.py`)

The apps load these models, run them on the prepared sequences, and then average predictions across models (ensemble voting average).

### Gaussian Process (optional)
`app.py` contains logic to load a GP “model dictionary” (via joblib) if present. If the corresponding pickle files exist, the GP predictions can be included in the ensemble.

---

## Notes / known quirks

- **`pyproject.toml` is incomplete for running the Streamlit apps** (it lists only `torch`). You will need to install Streamlit + data libraries manually unless the project metadata is updated.
- Some scripts contain overlapping helper functions and multiple app variants (`app.py`, `test.py`, `app_withn-beats.py`). Consider standardizing on one entrypoint for production use.
- File name `original_uploaded_file.csv.csv` likely should be renamed to `original_uploaded_file.csv`.

---

## Development

### Suggested improvements (optional)
- Add a `requirements.txt` or update `pyproject.toml` dependencies to include `streamlit`, `pandas`, `numpy`, `joblib`, `scikit-learn`.
- Add a small `data/` folder with a documented sample CSV (and a schema description).
- Add a `LICENSE` file.

---

## License
