from fastapi import FastAPI

app = FastAPI(
    title="Porky's Predictive API",
    description="API para la predicción de demanda del restaurante Porky's",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "Porky's Predictive API",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "machine-learning-api"
    }
