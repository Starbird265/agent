from fastapi import FastAPI
from api.routes.model_routes import router as model_routes

app = FastAPI(title="AI TrainEasy MVP",
             description="Automated Machine Learning Backend",
             version="1.0.0")

app.include_router(model_routes)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)