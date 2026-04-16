from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import auth, database, models, schemas

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=List[schemas.DepartmentResponse])
def list_departments(
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.get_current_user),
):
    return db.query(models.Department).order_by(models.Department.name.asc()).all()


@router.post("", response_model=schemas.DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: schemas.DepartmentCreate,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.require_roles([models.RoleEnum.admin])),
):
    if db.query(models.Department).filter(models.Department.name == payload.name).first():
        raise HTTPException(status_code=409, detail="Department already exists")

    department = models.Department(name=payload.name)
    db.add(department)
    db.commit()
    db.refresh(department)
    return department
