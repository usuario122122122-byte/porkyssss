import joblib
import numpy as np
import pandas as pd

from pathlib import Path
from sklearn.linear_model import LinearRegression
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


# Rutas del proyecto
PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASET_PATH = PROJECT_ROOT / "datasets" / "porkys_demand.csv"
MODEL_DIR = PROJECT_ROOT / "app" / "models"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


def prepare_data():

    # Cargar dataset
    df = pd.read_csv(DATASET_PATH)

    df["date"] = pd.to_datetime(df["date"])

    # Orden cronológico
    df = df.sort_values(["date", "hour"]).reset_index(drop=True)

    # Variables cíclicas
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

    df["day_sin"] = np.sin(
        2 * np.pi * df["day_of_week"] / 7
    )

    df["day_cos"] = np.cos(
        2 * np.pi * df["day_of_week"] / 7
    )

    # Variables de entrada
    features = [
        "hour_sin",
        "hour_cos",
        "day_sin",
        "day_cos",
        "is_weekend",
        "promotion",
        "temperature",
        "rain",
        "holiday"
    ]

    X = df[features]
    y = df["orders"]

    # Separación temporal 80/20 por días
    unique_dates = sorted(df["date"].unique())

    split_index = int(len(unique_dates) * 0.8)
    split_date = unique_dates[split_index]

    train_mask = df["date"] < split_date

    X_train = X.loc[train_mask]
    X_test = X.loc[~train_mask]

    y_train = y.loc[train_mask]
    y_test = y.loc[~train_mask]

    return X_train, X_test, y_train, y_test, features, split_date


def evaluate_model(name, model, X_test, y_test):

    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)

    rmse = np.sqrt(
        mean_squared_error(y_test, predictions)
    )

    r2 = r2_score(y_test, predictions)

    print(f"\n{name}")
    print("-" * 35)
    print(f"MAE:  {mae:.2f}")
    print(f"RMSE: {rmse:.2f}")
    print(f"R²:   {r2:.4f}")

    return {
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2
    }


def train_models():

    print("=" * 45)
    print("ENTRENAMIENTO DE MODELOS - PORKY'S")
    print("=" * 45)

    X_train, X_test, y_train, y_test, features, split_date = (
        prepare_data()
    )

    print(f"Registros de entrenamiento: {len(X_train)}")
    print(f"Registros de prueba: {len(X_test)}")
    print(f"Inicio del conjunto de prueba: {split_date.date()}")

    # Modelo 1: Regresión Lineal
    linear_model = Pipeline([
        ("scaler", StandardScaler()),
        ("model", LinearRegression())
    ])

    linear_model.fit(X_train, y_train)

    # Modelo 2: KNN
    knn_model = Pipeline([
        ("scaler", StandardScaler()),
        ("model", KNeighborsRegressor(
            n_neighbors=7,
            weights="distance"
        ))
    ])

    knn_model.fit(X_train, y_train)

    # Evaluación
    linear_metrics = evaluate_model(
        "REGRESIÓN LINEAL",
        linear_model,
        X_test,
        y_test
    )

    knn_metrics = evaluate_model(
        "KNN",
        knn_model,
        X_test,
        y_test
    )

    # Guardar modelos y variables utilizadas
    joblib.dump(
        {
            "model": linear_model,
            "features": features
        },
        MODEL_DIR / "linear_regression.joblib"
    )

    joblib.dump(
        {
            "model": knn_model,
            "features": features
        },
        MODEL_DIR / "knn.joblib"
    )

    print("\n" + "=" * 45)
    print("MODELOS GUARDADOS CORRECTAMENTE")
    print("=" * 45)

    print("\nComparación:")
    print(f"Regresión Lineal - MAE: {linear_metrics['MAE']:.2f}")
    print(f"KNN - MAE: {knn_metrics['MAE']:.2f}")


if __name__ == "__main__":
    train_models()
