from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = BASE_DIR / "app" / "models"

app = FastAPI(
    title="Porky's Predictive API",
    description="API académica para estimar la demanda horaria de Porky's usando Regresión Lineal y KNN sobre datos sintéticos.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

linear_model = None
knn_model = None
FEATURES: list[str] = []
model_error: str | None = None


def load_models() -> None:
    global linear_model, knn_model, FEATURES, model_error
    try:
        linear_path = MODEL_DIR / "linear_regression.joblib"
        knn_path = MODEL_DIR / "knn.joblib"
        if not linear_path.exists() or not knn_path.exists():
            raise FileNotFoundError("No se encontraron los modelos. Ejecuta: python -m app.models.train_model")
        linear_data = joblib.load(linear_path)
        knn_data = joblib.load(knn_path)
        linear_model = linear_data["model"]
        knn_model = knn_data["model"]
        FEATURES = knn_data["features"]
        model_error = None
    except Exception as exc:  # surfaced through /health rather than crashing imports
        model_error = str(exc)


load_models()


class PredictionRequest(BaseModel):
    date: date
    hour: int = Field(ge=0, le=23)
    promotion: bool = False
    temperature: float = Field(default=22.0, ge=-10, le=50)
    rain: bool = False
    holiday: bool = False


class ForecastRequest(BaseModel):
    start_date: date = Field(default_factory=date.today)
    start_hour: int = Field(default=0, ge=0, le=23)
    horizon: int = Field(default=24, ge=1, le=48)
    promotion: bool = False
    temperature: float = Field(default=22.0, ge=-10, le=50)
    rain: bool = False
    holiday: bool = False


def ensure_models() -> None:
    if linear_model is None or knn_model is None:
        raise HTTPException(status_code=503, detail=f"Modelos no disponibles: {model_error or 'error desconocido'}")


def prepare_features(data: PredictionRequest) -> pd.DataFrame:
    weekday = data.date.weekday()
    values = {
        "hour_sin": np.sin(2 * np.pi * data.hour / 24),
        "hour_cos": np.cos(2 * np.pi * data.hour / 24),
        "day_sin": np.sin(2 * np.pi * weekday / 7),
        "day_cos": np.cos(2 * np.pi * weekday / 7),
        "is_weekend": int(weekday >= 5),
        "promotion": int(data.promotion),
        "temperature": data.temperature,
        "rain": int(data.rain),
        "holiday": int(data.holiday),
    }
    return pd.DataFrame([[values[name] for name in FEATURES]], columns=FEATURES)


def predict_one(data: PredictionRequest) -> dict:
    ensure_models()
    features = prepare_features(data)
    linear = max(0.0, float(linear_model.predict(features)[0]))
    knn = max(0.0, float(knn_model.predict(features)[0]))
    return {
        "date": data.date.isoformat(),
        "hour": data.hour,
        "linear_regression": round(linear, 2),
        "knn": round(knn, 2),
        "recommended": round(knn, 2),
    }


@app.get("/")
def root():
    return {"message": "Porky's Predictive API", "status": "running", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy" if model_error is None else "degraded",
        "service": "machine-learning-api",
        "models_loaded": model_error is None,
        "model_error": model_error,
    }


@app.get("/model-info")
def model_info():
    ensure_models()
    return {
        "models": ["Regresión lineal", "KNN"],
        "recommended_model": "KNN",
        "knn_neighbors": 7,
        "knn_weights": "distance",
        "dataset": "Sintético académico: 180 días, 4320 registros horarios",
        "metrics_test": {
            "linear_regression": {"mae": 6.19, "rmse": 8.19, "r2": 0.5139},
            "knn": {"mae": 3.77, "rmse": 5.59, "r2": 0.7733},
        },
    }


@app.post("/predict")
def predict(data: PredictionRequest):
    try:
        return predict_one(data)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al generar predicción: {exc}") from exc


@app.post("/forecast")
def forecast(data: ForecastRequest):
    try:
        ensure_models()
        start = datetime.combine(data.start_date, datetime.min.time()).replace(hour=data.start_hour)
        predictions = []
        for offset in range(data.horizon):
            moment = start + timedelta(hours=offset)
            item = PredictionRequest(
                date=moment.date(), hour=moment.hour, promotion=data.promotion,
                temperature=data.temperature, rain=data.rain, holiday=data.holiday,
            )
            predictions.append(predict_one(item))
        return {
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "horizon": data.horizon,
            "recommended_model": "knn",
            "data_notice": "Estimaciones académicas basadas en un conjunto de datos sintético; no representan datos reales del negocio.",
            "predictions": predictions,
            "summary": {
                "total_knn": round(sum(p["knn"] for p in predictions), 2),
                "total_linear_regression": round(sum(p["linear_regression"] for p in predictions), 2),
                "peak_hour": max(predictions, key=lambda p: p["knn"])["hour"],
                "peak_demand": max(p["knn"] for p in predictions),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al generar pronóstico: {exc}") from exc
