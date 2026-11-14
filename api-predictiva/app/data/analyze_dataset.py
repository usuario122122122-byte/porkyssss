import pandas as pd
import matplotlib.pyplot as plt

from pathlib import Path

# Cargar dataset
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = PROJECT_ROOT / "datasets" / "porkys_demand.csv"

df = pd.read_csv(DATASET_PATH)

# 1. Demanda promedio por hora
hourly = df.groupby("hour")["orders"].mean()

plt.figure(figsize=(12, 5))
hourly.plot(kind="bar")
plt.title("Demanda promedio de pedidos por hora")
plt.xlabel("Hora")
plt.ylabel("Pedidos promedio")
plt.xticks(rotation=0)
plt.tight_layout()
plt.savefig(PROJECT_ROOT / "datasets" / "demand_by_hour.png")
plt.close()

# 2. Demanda por día de la semana
weekly = df.groupby("day_of_week")["orders"].mean()

days = ["Lunes", "Martes", "Miércoles",
        "Jueves", "Viernes", "Sábado", "Domingo"]

plt.figure(figsize=(10, 5))
plt.bar(days, weekly.values)
plt.title("Demanda promedio por día de la semana")
plt.ylabel("Pedidos promedio por hora")
plt.xticks(rotation=25)
plt.tight_layout()
plt.savefig(PROJECT_ROOT / "datasets" / "demand_by_weekday.png")
plt.close()

# 3. Comparación de promociones
promotion = df.groupby("promotion")["orders"].mean()

print("\nDEMANDA SEGÚN PROMOCIONES")
print(promotion.rename(index={
    0: "Sin promoción",
    1: "Con promoción"
}))

# 4. Comparación de fines de semana
weekend = df.groupby("is_weekend")["orders"].mean()

print("\nDEMANDA SEGÚN TIPO DE DÍA")
print(weekend.rename(index={
    0: "Día laborable",
    1: "Fin de semana"
}))

print("\nGráficos guardados en datasets/")

# 5. Comparación de demanda según lluvia
rain = df.groupby("rain")["orders"].mean()

print("\nDEMANDA SEGÚN LLUVIA")
print(rain.rename(index={
    0: "Sin lluvia",
    1: "Con lluvia"
}))

# 6. Comparación de demanda según feriados
holiday = df.groupby("holiday")["orders"].mean()

print("\nDEMANDA SEGÚN FERIADOS")
print(holiday.rename(index={
    0: "Día normal",
    1: "Feriado"
}))
