from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import auth, database, models, schemas

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[schemas.UserResponse])
def list_users(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role in [models.RoleEnum.admin, models.RoleEnum.hr]:
        return db.query(models.User).all()

    if current_user.role == models.RoleEnum.manager:
        manager_emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not manager_emp:
            return [current_user]
        team = db.query(models.Employee).filter(models.Employee.manager_id == manager_emp.id).all()
        team_user_ids = [member.user_id for member in team]
        return db.query(models.User).filter(models.User.id.in_(team_user_ids + [current_user.id])).all()

    return [current_user]


@router.get("/employees", response_model=List[schemas.EmployeeResponse])
def list_employee_profiles(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role in [models.RoleEnum.admin, models.RoleEnum.hr]:
        return db.query(models.Employee).all()

    if current_user.role == models.RoleEnum.manager:
        manager_emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not manager_emp:
            return []
        return db.query(models.Employee).filter(models.Employee.manager_id == manager_emp.id).all()

    current_emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    return [current_emp] if current_emp else []


@router.post("", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.require_roles([models.RoleEnum.admin])),
):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already exists")

    if payload.department_id is not None:
        dept = db.query(models.Department).filter(models.Department.id == payload.department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")

    user = models.User(
        name=payload.name,
        email=payload.email,
        password=auth.get_password_hash(payload.password),
        role=payload.role,
        department_id=payload.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if payload.role in [models.RoleEnum.manager, models.RoleEnum.employee]:
        emp = models.Employee(user_id=user.id, manager_id=None)
        db.add(emp)
        db.commit()

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.require_roles([models.RoleEnum.admin])),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    employee = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()
    if employee:
        db.delete(employee)

    db.delete(user)
    db.commit()
    return None


@router.post("/employees/{employee_id}/manager", response_model=schemas.EmployeeResponse)
def assign_manager(
    employee_id: int,
    body: schemas.AssignManagerRequest,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.require_roles([models.RoleEnum.admin])),
):
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    manager = db.query(models.Employee).filter(models.Employee.id == body.manager_employee_id).first()

    if not employee or not manager:
        raise HTTPException(status_code=404, detail="Employee or manager not found")

    manager_user = db.query(models.User).filter(models.User.id == manager.user_id).first()
    if not manager_user or manager_user.role != models.RoleEnum.manager:
        raise HTTPException(status_code=400, detail="Assigned manager must have manager role")

    employee.manager_id = manager.id
    db.commit()
    db.refresh(employee)
    return employee
