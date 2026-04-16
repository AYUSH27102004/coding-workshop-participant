from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import auth, database, models, schemas

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[schemas.UserResponse])
def list_users(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role == models.RoleEnum.admin:
        return db.query(models.User).all()

    if current_user.role == models.RoleEnum.hr:
        handled_department_ids = [
            row[0]
            for row in (
                db.query(models.HRDepartment.department_id)
                .filter(models.HRDepartment.hr_id == current_user.id)
                .all()
            )
        ]
        if not handled_department_ids:
            return [current_user]

        return (
            db.query(models.User)
            .filter(
                models.User.department_id.in_(handled_department_ids),
                models.User.role.in_([models.RoleEnum.employee, models.RoleEnum.manager, models.RoleEnum.hr]),
            )
            .all()
        )

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
    performance: Optional[str] = Query(default=None),
    department: Optional[int] = Query(default=None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = (
        db.query(models.Employee)
        .join(models.User, models.User.id == models.Employee.user_id)
        .outerjoin(models.Department, models.Department.id == models.User.department_id)
    )

    if current_user.role == models.RoleEnum.admin:
        pass

    elif current_user.role == models.RoleEnum.hr:
        handled_department_ids = [
            row[0]
            for row in (
                db.query(models.HRDepartment.department_id)
                .filter(models.HRDepartment.hr_id == current_user.id)
                .all()
            )
        ]
        if not handled_department_ids:
            return []
        query = query.filter(models.User.department_id.in_(handled_department_ids))

    elif current_user.role == models.RoleEnum.manager:
        if current_user.department_id is None:
            return []
        query = query.filter(models.User.department_id == current_user.department_id)

    else:
        current_emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not current_emp:
            return []
        query = query.filter(models.Employee.id == current_emp.id)

    if department:
        query = query.filter(models.User.department_id == department)

    if performance:
        normalized_performance = performance.strip().lower()
        avg_rating_subquery = (
            db.query(
                models.Performance.employee_id.label("employee_id"),
                func.avg(models.Performance.rating).label("avg_rating"),
            )
            .group_by(models.Performance.employee_id)
            .subquery()
        )
        query = query.join(avg_rating_subquery, avg_rating_subquery.c.employee_id == models.Employee.id)

        if normalized_performance == "high":
            query = query.filter(avg_rating_subquery.c.avg_rating >= 4)
        elif normalized_performance == "low":
            query = query.filter(avg_rating_subquery.c.avg_rating < 3)
        else:
            raise HTTPException(status_code=400, detail="Invalid employees performance filter")

    return query.all()


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
