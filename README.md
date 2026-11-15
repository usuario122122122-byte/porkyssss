# Porky's — Sistema Predictivo de Pedidos y Gestión de Demanda

MVP académico con frontend React + TypeScript + Vite, Supabase/PostgreSQL y una API de predicción FastAPI. El módulo predictivo compara Regresión Lineal y KNN con un conjunto de datos **sintético**; no utiliza datos históricos de una empresa real.

## Componentes

- `src/`: panel de operaciones, catálogo, registro/consulta de pedidos y vista de pronóstico.
- `supabase/migrations/`: modelo relacional, políticas RLS y funciones transaccionales.
- `api-predictiva/`: generación/análisis del dataset, entrenamiento/evaluación y API REST.
- `api-predictiva/datasets/porkys_demand.csv`: 180 días × 24 horas = 4,320 observaciones sintéticas.

## 1. Configurar Supabase

1. En Supabase, abre **Project Settings → API**.
2. Copia la Project URL y la publishable/anon key.
3. En la raíz del proyecto, crea `.env` a partir de `.env.example`:

```env
VITE_SUPABASE_URL=https://TU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=TU_PUBLISHABLE_O_ANON_KEY
VITE_PREDICTION_API_URL=http://127.0.0.1:8000
```

La URL debe ser la raíz del proyecto. El cliente elimina automáticamente un sufijo accidental `/rest/v1/`. No uses una `service_role` o secret key en el navegador.

4. Ejecuta en **Supabase → SQL Editor** el contenido de `supabase/migrations/20261115020000_porkys_mvp_functions_and_seed.sql`. Esta migración:
   - Inserta el catálogo académico inicial de seis productos si aún no existen.
   - Crea `registrar_pedido(...)`, que registra cliente, pedido y detalles en una única transacción.
   - Crea `guardar_predicciones(...)`, que registra una ejecución y sus predicciones en una única transacción.

El modelo físico documentado no contiene columnas para tipo de entrega ni método de pago; por eso el formulario no solicita esos datos para no aparentar que se guardan.

## 2. Ejecutar frontend

Desde la raíz:

```bash
npm install
npm run dev
```

Abre la URL que indique Vite (normalmente `http://localhost:5173`; si utiliza otro puerto, la API admite puertos locales).

Comprobaciones:

```bash
npm run typecheck
npm run build
```

## 3. Ejecutar API predictiva

En otra terminal:

```bash
cd api-predictiva
python -m venv .venv
source .venv/bin/activate.fish  # Fish (CachyOS)
# Bash/Zsh: source .venv/bin/activate
pip install -r requirements.txt
python -m app.models.train_model
uvicorn app.main:app --reload --port 8000
```

Documentación interactiva: `http://127.0.0.1:8000/docs`.

Endpoints:

- `GET /health`: disponibilidad de modelos.
- `GET /model-info`: algoritmos, configuración y métricas de evaluación.
- `POST /predict`: predicción de una hora.
- `POST /forecast`: pronóstico de hasta 48 horas para ambos modelos.

## 4. Flujo funcional

### Pedidos

1. React consulta productos disponibles desde `producto`.
2. El formulario crea el carrito y calcula el importe.
3. React invoca `registrar_pedido` mediante Supabase RPC.
4. La función PostgreSQL busca/crea el cliente, crea el pedido y sus detalles de forma atómica.
5. El panel consulta pedidos, clientes y detalles; permite actualizar el estado del pedido.

### Predicción

1. La vista Demanda envía fecha/hora y variables de simulación a FastAPI.
2. FastAPI construye las variables cíclicas y ejecuta Regresión Lineal y KNN.
3. KNN se presenta como modelo recomendado según la evaluación sobre el dataset sintético.
4. React persiste la ejecución y las 24 predicciones en `ejecucion_prediccion` y `prediccion_demanda` usando RPC.

## 5. Dataset y evaluación

- 180 días, desde 2026-05-01; 24 registros por día.
- Variables: hora, día de semana, fin de semana, promoción, temperatura, lluvia y feriado.
- Objetivo: cantidad sintética de pedidos por hora.
- Separación cronológica 80/20: 3,456 registros de entrenamiento y 864 de prueba.
- Regresión Lineal: MAE 6.19, RMSE 8.19, R² 0.5139.
- KNN (k=7, pesos por distancia): MAE 3.77, RMSE 5.59, R² 0.7733.

Estas métricas describen únicamente el comportamiento frente a datos generados por la simulación. No deben presentarse como precisión validada en operaciones reales.

## Limitaciones conocidas del MVP

- El login es una pantalla de demostración: acepta las credenciales introducidas y no autentica usuarios con Supabase Auth.
- No se asignan repartidores desde el panel todavía; la vista de entregas muestra pedidos cuyo estado es `En camino`.
- La tabla `dato_demanda` queda disponible para integrar datos históricos reales si se obtienen con autorización. El entrenamiento actual se hace desde el CSV sintético local.
- La API se ejecuta localmente; para una demostración desde otro equipo debe desplegarse y actualizarse `VITE_PREDICTION_API_URL`.
