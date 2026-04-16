from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from fastapi import Depends, Query

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
from .routers import auth, users, performance, competencies, dashboard, projects, departments, employee, manager, recommendations, hr, admin
from . import auth as app_auth, database, models, schemas

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(performance.router)
app.include_router(competencies.router)
app.include_router(dashboard.router)
app.include_router(projects.router)
app.include_router(departments.router)
app.include_router(employee.router)
app.include_router(manager.router)
app.include_router(recommendations.router)
app.include_router(hr.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to ACME Employee Performance API"}


@app.get("/employees", response_model=List[schemas.EmployeeResponse])
def list_employees_alias(
    performance: Optional[str] = Query(default=None),
    department: Optional[int] = Query(default=None),
    db=Depends(database.get_db),
    current_user: models.User = Depends(app_auth.get_current_user),
):
    return users.list_employee_profiles(
        performance=performance,
        department=department,
        db=db,
        current_user=current_user,
    )
