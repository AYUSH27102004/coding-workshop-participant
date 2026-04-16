from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import auth, database, models, schemas

router = APIRouter(prefix="/manager", tags=["Manager Module"])


@router.get("/dashboard", response_model=schemas.ManagerDashboardResponse)
def get_manager_dashboard(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_roles([models.RoleEnum.manager])),
):
    if current_user.department_id is None:
        raise HTTPException(status_code=400, detail="Manager does not have an assigned department")

    department = db.query(models.Department).filter(models.Department.id == current_user.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    department_employee_user_ids = [
        row[0]
        for row in (
            db.query(models.User.id)
            .filter(
                models.User.department_id == current_user.department_id,
                models.User.role == models.RoleEnum.employee,
            )
            .all()
        )
    ]

    if not department_employee_user_ids:
        return {
            "manager": current_user,
            "department_name": department.name,
            "team_size": 0,
            "pending_projects_count": 0,
            "underperforming_count": 0,
            "underperforming_employees": [],
            "top_performers": [],
            "team_average_ratings": [],
            "department_performance_trend": [],
            "trend_status": "declining",
        }

    department_employee_rows = (
        db.query(models.Employee.id, models.User.name)
        .join(models.User, models.User.id == models.Employee.user_id)
        .filter(models.Employee.user_id.in_(department_employee_user_ids))
        .all()
    )

    employee_id_to_name = {employee_id: name for employee_id, name in department_employee_rows}
    department_employee_ids = list(employee_id_to_name.keys())

    today = date.today()
    pending_projects_count = (
        db.query(func.count(models.Project.id))
        .filter(
            models.Project.assigned_to.in_(department_employee_ids),
            ((models.Project.deadline.is_(None)) | (models.Project.deadline >= today)),
        )
        .scalar()
    )

    latest_performance_subquery = (
        db.query(
            models.Performance.employee_id.label("employee_id"),
            func.max(models.Performance.id).label("latest_perf_id"),
        )
        .filter(models.Performance.employee_id.in_(department_employee_ids))
        .group_by(models.Performance.employee_id)
        .subquery()
    )

    underperforming_rows = (
        db.query(models.Performance.employee_id, models.Performance.rating)
        .join(
            latest_performance_subquery,
            models.Performance.id == latest_performance_subquery.c.latest_perf_id,
        )
        .filter(models.Performance.rating < 3)
        .all()
    )

    underperforming_employees = [
        employee_id_to_name.get(employee_id, "Unknown Employee")
        for employee_id, _ in underperforming_rows
    ]

    top_performer_rows = (
        db.query(models.Performance.employee_id, models.Performance.rating)
        .join(
            latest_performance_subquery,
            models.Performance.id == latest_performance_subquery.c.latest_perf_id,
        )
        .order_by(models.Performance.rating.desc(), models.Performance.id.desc())
        .limit(3)
        .all()
    )

    top_performers = [
        {
            "name": employee_id_to_name.get(employee_id, "Unknown Employee"),
            "rating": rating,
        }
        for employee_id, rating in top_performer_rows
    ]

    team_avg_rows = (
        db.query(models.Performance.employee_id, func.avg(models.Performance.rating))
        .filter(models.Performance.employee_id.in_(department_employee_ids))
        .group_by(models.Performance.employee_id)
        .order_by(func.avg(models.Performance.rating).desc())
        .all()
    )

    team_average_ratings = [
        {
            "employee_name": employee_id_to_name.get(employee_id, "Unknown Employee"),
            "average_rating": round(float(avg_rating), 2),
        }
        for employee_id, avg_rating in team_avg_rows
        if avg_rating is not None
    ]

    monthly_avg_rows = (
        db.query(models.Performance.month, func.avg(models.Performance.rating))
        .filter(models.Performance.employee_id.in_(department_employee_ids))
        .group_by(models.Performance.month)
        .order_by(models.Performance.month.asc())
        .all()
    )

    department_performance_trend = [
        {
            "month": month,
            "average_rating": round(float(avg_rating), 2),
        }
        for month, avg_rating in monthly_avg_rows
        if avg_rating is not None
    ]

    if len(department_performance_trend) >= 2:
        trend_status = (
            "improving"
            if department_performance_trend[-1]["average_rating"] > department_performance_trend[0]["average_rating"]
            else "declining"
        )
    else:
        trend_status = "declining"

    return {
        "manager": current_user,
        "department_name": department.name,
        "team_size": len(department_employee_ids),
        "pending_projects_count": int(pending_projects_count or 0),
        "underperforming_count": len(underperforming_employees),
        "underperforming_employees": underperforming_employees,
        "top_performers": top_performers,
        "team_average_ratings": team_average_ratings,
        "department_performance_trend": department_performance_trend,
        "trend_status": trend_status,
    }
