from datetime import date
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import auth, database, models, schemas

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/overview", response_model=List[schemas.AdminDepartmentOverviewItem])
def get_admin_department_overview(
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.require_roles([models.RoleEnum.admin])),
):
    today = date.today()
    departments = db.query(models.Department).order_by(models.Department.name.asc()).all()

    overview_rows = []
    for department in departments:
        department_employee_ids = [
            row[0]
            for row in (
                db.query(models.Employee.id)
                .join(models.User, models.User.id == models.Employee.user_id)
                .filter(
                    models.User.department_id == department.id,
                    models.User.role == models.RoleEnum.employee,
                )
                .all()
            )
        ]

        latest_manager_ratings = []
        for employee_id in department_employee_ids:
            latest_rating_row = (
                db.query(models.Performance.rating)
                .filter(
                    models.Performance.employee_id == employee_id,
                    models.Performance.manager_id.is_not(None),
                )
                .order_by(models.Performance.date.desc(), models.Performance.id.desc())
                .first()
            )
            if latest_rating_row:
                latest_manager_ratings.append(float(latest_rating_row[0]))

        if latest_manager_ratings:
            avg_manager_rating = round(sum(latest_manager_ratings) / len(latest_manager_ratings), 2)
        else:
            avg_manager_rating = 0.0

        avg_performance_score_raw = (
            db.query(func.avg(models.Performance.rating))
            .filter(
                models.Performance.employee_id.in_(department_employee_ids) if department_employee_ids else False,
                models.Performance.manager_id.is_(None),
            )
            .scalar()
        )
        avg_performance_score = round(float(avg_performance_score_raw), 2) if avg_performance_score_raw is not None else 0.0

        # Project completion is inferred using the existing deadline-based status convention in this app.
        projects_on_time = (
            db.query(func.count(models.Project.id))
            .filter(
                models.Project.assigned_to.in_(department_employee_ids) if department_employee_ids else False,
                models.Project.deadline.is_not(None),
                models.Project.deadline >= today,
            )
            .scalar()
            or 0
        )

        projects_delayed = (
            db.query(func.count(models.Project.id))
            .filter(
                models.Project.assigned_to.in_(department_employee_ids) if department_employee_ids else False,
                models.Project.deadline.is_not(None),
                models.Project.deadline < today,
            )
            .scalar()
            or 0
        )

        completed_count = int(projects_on_time) + int(projects_delayed)
        completion_rate = round((int(projects_on_time) / completed_count) * 100, 2) if completed_count > 0 else 0.0

        overview_rows.append(
            {
                "department_name": department.name,
                "avg_manager_rating": avg_manager_rating,
                "avg_performance_score": avg_performance_score,
                "projects_on_time": int(projects_on_time),
                "projects_delayed": int(projects_delayed),
                "completion_rate": completion_rate,
            }
        )

    return overview_rows
