from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import auth, database, models

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.role in [models.RoleEnum.admin, models.RoleEnum.hr]:
        department_rows = (
            db.query(models.Department.name, func.count(models.User.id))
            .outerjoin(models.User, models.User.department_id == models.Department.id)
            .group_by(models.Department.name)
            .all()
        )

        avg_by_department = (
            db.query(models.Department.name, func.avg(models.PerformanceReview.rating))
            .join(models.User, models.User.department_id == models.Department.id)
            .join(models.Employee, models.Employee.user_id == models.User.id)
            .outerjoin(models.PerformanceReview, models.PerformanceReview.employee_id == models.Employee.id)
            .group_by(models.Department.name)
            .all()
        )

        return {
            "total_users": db.query(models.User).count(),
            "total_projects": db.query(models.Project).count(),
            "total_reviews": db.query(models.PerformanceReview).count(),
            "department_counts": [{"name": name, "count": count} for name, count in department_rows],
            "department_avg_rating": [
                {"name": name, "rating": round(float(rating), 2) if rating else 0.0}
                for name, rating in avg_by_department
            ],
        }

    if current_user.role == models.RoleEnum.manager:
        manager_employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        team = db.query(models.Employee).filter(models.Employee.manager_id == manager_employee.id).all() if manager_employee else []
        team_ids = [member.id for member in team]

        underperforming_count = (
            db.query(models.PerformanceReview)
            .filter(models.PerformanceReview.employee_id.in_(team_ids), models.PerformanceReview.rating <= 2)
            .count()
            if team_ids
            else 0
        )

        return {
            "team_size": len(team),
            "pending_projects": db.query(models.Project).filter(models.Project.assigned_by == manager_employee.id).count() if manager_employee else 0,
            "underperforming_count": underperforming_count,
        }

    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        return {"assigned_projects": 0, "my_reviews": 0, "my_dev_plans": 0}

    return {
        "assigned_projects": db.query(models.Project).filter(models.Project.assigned_to == employee.id).count(),
        "my_reviews": db.query(models.PerformanceReview).filter(models.PerformanceReview.employee_id == employee.id).count(),
        "my_dev_plans": db.query(models.DevelopmentPlan).filter(models.DevelopmentPlan.employee_id == employee.id).count(),
    }