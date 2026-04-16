from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session, aliased
from .. import auth, database, models, schemas

router = APIRouter(tags=["Performance"])


def _ensure_performance_rating_columns(db: Session) -> None:
    """Best-effort backfill for older DBs that may not yet have rating metadata columns."""
    engine = db.get_bind()
    inspector = inspect(engine)
    column_names = {column["name"] for column in inspector.get_columns("performance")}

    if "manager_id" not in column_names:
        db.execute(text("ALTER TABLE performance ADD COLUMN manager_id INTEGER"))
    if "date" not in column_names:
        db.execute(text("ALTER TABLE performance ADD COLUMN date DATE"))
    db.commit()


@router.post("/ratings", response_model=schemas.RatingResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_rating(
    payload: schemas.RatingCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_roles([models.RoleEnum.manager])),
):
    _ensure_performance_rating_columns(db)

    manager_employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not manager_employee:
        raise HTTPException(status_code=404, detail="Manager employee profile not found")

    if current_user.department_id is None:
        raise HTTPException(status_code=400, detail="Manager does not have an assigned department")

    target_employee = (
        db.query(models.Employee)
        .join(models.User, models.User.id == models.Employee.user_id)
        .filter(models.Employee.id == payload.employee_id)
        .first()
    )
    if not target_employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    target_user = db.query(models.User).filter(models.User.id == target_employee.user_id).first()
    if not target_user or target_user.role != models.RoleEnum.employee:
        raise HTTPException(status_code=403, detail="Managers can only rate employees")

    if target_user.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Managers can only rate employees in their own department")

    current_month = f"{date.today().year:04d}-{date.today().month:02d}"
    existing_rating = (
        db.query(models.Performance)
        .filter(
            models.Performance.employee_id == target_employee.id,
            models.Performance.manager_id == manager_employee.id,
            models.Performance.month == current_month,
        )
        .order_by(models.Performance.id.desc())
        .first()
    )

    if existing_rating:
        existing_rating.rating = payload.rating
        existing_rating.feedback = payload.feedback or ""
        existing_rating.date = date.today()
        db.commit()
        db.refresh(existing_rating)
        return existing_rating

    rating_row = models.Performance(
        employee_id=target_employee.id,
        manager_id=manager_employee.id,
        month=current_month,
        rating=payload.rating,
        tasks_completed=0,
        feedback=payload.feedback or "",
        date=date.today(),
    )
    db.add(rating_row)
    db.commit()
    db.refresh(rating_row)
    return rating_row


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

    target_user = db.query(models.User).filter(models.User.id == target_employee.user_id).first()
    manager_user = db.query(models.User).filter(models.User.id == current_user.id).first()
    return {
        "id": review.id,
        "employee_id": review.employee_id,
        "manager_id": review.manager_id,
        "rating": review.rating,
        "feedback": review.feedback,
        "date": review.date,
        "employee_name": target_user.name if target_user else None,
        "manager_name": manager_user.name if manager_user else None,
    }


@router.get("/reviews", response_model=List[schemas.ReviewResponse])
def list_reviews(
    rating: Optional[str] = Query(default=None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    employee_user = aliased(models.User)
    manager_employee = aliased(models.Employee)
    manager_user = aliased(models.User)

    query = (
        db.query(
            models.PerformanceReview.id,
            models.PerformanceReview.employee_id,
            models.PerformanceReview.manager_id,
            models.PerformanceReview.rating,
            models.PerformanceReview.feedback,
            models.PerformanceReview.date,
            employee_user.name.label("employee_name"),
            manager_user.name.label("manager_name"),
        )
        .join(models.Employee, models.Employee.id == models.PerformanceReview.employee_id)
        .join(employee_user, employee_user.id == models.Employee.user_id)
        .join(manager_employee, manager_employee.id == models.PerformanceReview.manager_id)
        .join(manager_user, manager_user.id == manager_employee.user_id)
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
        query = query.filter(employee_user.department_id.in_(handled_department_ids))

    elif current_user.role == models.RoleEnum.manager:
        if current_user.department_id is None:
            return []
        query = query.filter(employee_user.department_id == current_user.department_id)

    else:
        emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not emp:
            return []
        query = query.filter(models.PerformanceReview.employee_id == emp.id)

    if rating:
        normalized_rating = rating.strip().lower()
        if normalized_rating == "high":
            query = query.filter(models.PerformanceReview.rating >= 4)
        elif normalized_rating == "average":
            query = query.filter(models.PerformanceReview.rating == 3)
        elif normalized_rating == "low":
            query = query.filter(models.PerformanceReview.rating < 3)
        else:
            raise HTTPException(status_code=400, detail="Invalid reviews rating filter")

    rows = query.all()
    return [
        {
            "id": row.id,
            "employee_id": row.employee_id,
            "manager_id": row.manager_id,
            "rating": row.rating,
            "feedback": row.feedback,
            "date": row.date,
            "employee_name": row.employee_name,
            "manager_name": row.manager_name,
        }
        for row in rows
    ]


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

    target_user = db.query(models.User).filter(models.User.id == target_employee.user_id).first()
    return {
        "id": plan.id,
        "employee_id": plan.employee_id,
        "goal": plan.goal,
        "progress": plan.progress,
        "status": plan.status,
        "employee_name": target_user.name if target_user else None,
    }


@router.get("/dev-plans", response_model=List[schemas.DevPlanResponse])
def list_dev_plans(
    status: Optional[str] = Query(default=None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = (
        db.query(
            models.DevelopmentPlan.id,
            models.DevelopmentPlan.employee_id,
            models.DevelopmentPlan.goal,
            models.DevelopmentPlan.progress,
            models.DevelopmentPlan.status,
            models.User.name.label("employee_name"),
        )
        .join(models.Employee, models.Employee.id == models.DevelopmentPlan.employee_id)
        .join(models.User, models.User.id == models.Employee.user_id)
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
        emp = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not emp:
            return []
        query = query.filter(models.DevelopmentPlan.employee_id == emp.id)

    if status:
        normalized_status = status.strip().lower()
        if normalized_status == "completed":
            query = query.filter(func.lower(models.DevelopmentPlan.status) == "completed")
        elif normalized_status == "active":
            query = query.filter(func.lower(models.DevelopmentPlan.status) != "completed")
        else:
            raise HTTPException(status_code=400, detail="Invalid dev-plans status filter")

    rows = query.all()
    return [
        {
            "id": row.id,
            "employee_id": row.employee_id,
            "goal": row.goal,
            "progress": row.progress,
            "status": row.status,
            "employee_name": row.employee_name,
        }
        for row in rows
    ]
