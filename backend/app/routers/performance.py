from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import auth, database, models, schemas

router = APIRouter(tags=["Performance"])


@router.post("/reviews", response_model=schemas.ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: schemas.ReviewCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_roles([models.RoleEnum.manager])),
):
    manager_employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not manager_employee:
        raise HTTPException(status_code=404, detail="Manager employee profile not found")

    target_employee = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
    if not target_employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if target_employee.manager_id != manager_employee.id:
        raise HTTPException(status_code=403, detail="Managers can only review direct reports")

    review = models.PerformanceReview(
        employee_id=payload.employee_id,
        manager_id=manager_employee.id,
        rating=payload.rating,
        feedback=payload.feedback,
        date=payload.date,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/reviews", response_model=List[schemas.ReviewResponse])
def list_reviews(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role in [models.RoleEnum.admin, models.RoleEnum.hr]:
        return db.query(models.PerformanceReview).all()

    if current_user.role == models.RoleEnum.manager:
        manager_employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not manager_employee:
            return []
        return db.query(models.PerformanceReview).filter(models.PerformanceReview.manager_id == manager_employee.id).all()

    emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not emp:
        return []
    return db.query(models.PerformanceReview).filter(models.PerformanceReview.employee_id == emp.id).all()


@router.post("/dev-plans", response_model=schemas.DevPlanResponse, status_code=status.HTTP_201_CREATED)
def create_dev_plan(
    payload: schemas.DevPlanCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_roles([models.RoleEnum.manager])),
):
    manager_employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not manager_employee:
        raise HTTPException(status_code=404, detail="Manager employee profile not found")

    target_employee = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
    if not target_employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if target_employee.manager_id != manager_employee.id:
        raise HTTPException(status_code=403, detail="Managers can only create plans for direct reports")

    plan = models.DevelopmentPlan(**payload.dict())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/dev-plans", response_model=List[schemas.DevPlanResponse])
def list_dev_plans(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role in [models.RoleEnum.admin, models.RoleEnum.hr]:
        return db.query(models.DevelopmentPlan).all()

    if current_user.role == models.RoleEnum.manager:
        manager_employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not manager_employee:
            return []
        team = db.query(models.Employee).filter(models.Employee.manager_id == manager_employee.id).all()
        team_ids = [member.id for member in team]
        if not team_ids:
            return []
        return db.query(models.DevelopmentPlan).filter(models.DevelopmentPlan.employee_id.in_(team_ids)).all()

    emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not emp:
        return []
    return db.query(models.DevelopmentPlan).filter(models.DevelopmentPlan.employee_id == emp.id).all()
