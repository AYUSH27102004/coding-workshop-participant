from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import auth, database, models, schemas

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_roles([models.RoleEnum.manager])),
):
    manager_employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not manager_employee:
        raise HTTPException(status_code=404, detail="Manager employee profile not found")

    target_employee = db.query(models.Employee).filter(models.Employee.id == payload.assigned_to).first()
    if not target_employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if target_employee.manager_id != manager_employee.id:
        raise HTTPException(status_code=403, detail="Managers can only assign projects to direct reports")

    project = models.Project(
        title=payload.title,
        description=payload.description,
        assigned_to=payload.assigned_to,
        assigned_by=manager_employee.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=List[schemas.ProjectResponse])
def get_projects(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role in [models.RoleEnum.admin, models.RoleEnum.hr]:
        return db.query(models.Project).all()

    if current_user.role == models.RoleEnum.manager:
        manager_employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not manager_employee:
            return []
        return db.query(models.Project).filter(models.Project.assigned_by == manager_employee.id).all()

    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        return []
    return db.query(models.Project).filter(models.Project.assigned_to == employee.id).all()
