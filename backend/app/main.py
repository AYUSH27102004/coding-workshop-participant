from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Employee Performance Management API",
    description="Dynamic backend for employee performance management system.",
    version="1.0.0"
)

# Origins for CORS (allow React frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to wildcard temporarily for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import Routers
from .routers import auth, users, performance, competencies, dashboard, projects, departments

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(performance.router)
app.include_router(competencies.router)
app.include_router(dashboard.router)
app.include_router(projects.router)
app.include_router(departments.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to ACME Employee Performance API"}
