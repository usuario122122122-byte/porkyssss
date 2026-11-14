import numpy as np
import pandas as pd

from pathlib import Path


# Configuración de la simulación
DAYS = 180
START_DATE = "2026-05-01"
RANDOM_SEED = 42


def generate_dataset():
    """
    Genera datos horarios sintéticos de demanda
    para el restaurante Porky's.
    """

    rng = np.random.default_rng(RANDOM_SEED)

    dates = pd.date_range(
        start=START_DATE,
        periods=DAYS,
        freq="D"
    )

    records = []

    for date in dates:
        day_of_week = date.day_of_week

        is_weekend = int(day_of_week >= 5)

        # Simulación de promociones y condiciones climáticas
        promotion = int(rng.random() < 0.25)
        temperature = round(rng.normal(22, 4), 1)
        rain = int(rng.random() < 0.20)
        holiday = int(rng.random() < 0.04)

        for hour in range(24):

            # Demanda base según horario
            if 12 <= hour <= 15:
                base_demand = 18
            elif 19 <= hour <= 22:
                base_demand = 25
            elif 16 <= hour <= 16:
                base_demand = 8
            elif hour == 16:
                base_demand = 8
            elif 17 <= hour <= 18:
                base_demand = 12
            elif 8 <= hour <= 11:
                base_demand = 5
            else:
                base_demand = 2

            # Incremento por día de semana
            weekend_effect = 1.35 if is_weekend else 1.0

            # Incremento por promociones
            promotion_effect = 1.20 if promotion else 1.0

            # Variación climática
            weather_effect = 1.10 if rain else 1.0

            # Incremento por feriados
            holiday_effect = 1.25 if holiday else 1.0

            # Temperatura extrema puede modificar la demanda
            temperature_effect = 1.0 + (
                max(0, 18 - temperature) * 0.008
            )

            expected_demand = (
                base_demand
                * weekend_effect
                * promotion_effect
                * weather_effect
                * holiday_effect
                * temperature_effect
            )

            # Variación aleatoria para simular demanda realista
            orders = rng.poisson(expected_demand)

            records.append({
                "date": date.strftime("%Y-%m-%d"),
                "hour": hour,
                "day_of_week": day_of_week,
                "is_weekend": is_weekend,
                "promotion": promotion,
                "temperature": temperature,
                "rain": rain,
                "holiday": holiday,
                "orders": orders
            })

    df = pd.DataFrame(records)

    # Crear carpeta de salida si no existe
    project_root = Path(__file__).resolve().parents[2]
    output_dir = project_root / "datasets"

    output_dir.mkdir(parents=True, exist_ok=True)

    output_file = output_dir / "porkys_demand.csv"

    df.to_csv(output_file, index=False)

    print("=" * 50)
    print("DATASET DE PORKY'S GENERADO CORRECTAMENTE")
    print("=" * 50)
    print(f"Total de registros: {len(df)}")
    print(f"Periodo: {df['date'].min()} hasta {df['date'].max()}")
    print(f"Promedio de pedidos por hora: {df['orders'].mean():.2f}")
    print(f"Total de pedidos simulados: {df['orders'].sum()}")
    print(f"Archivo generado: {output_file}")
    print("=" * 50)

    return df


if __name__ == "__main__":
    generate_dataset()
