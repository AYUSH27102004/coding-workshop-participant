from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, aliased
from .. import auth, database, models, schemas

router = APIRouter(prefix="/employee", tags=["Employee Module"])


def _last_month_key() -> str:
    now = datetime.utcnow()
    year = now.year
    month = now.month - 1
    if month == 0:
        month = 12
        year -= 1
    return f"{year:04d}-{month:02d}"


@router.get("/dashboard", response_model=schemas.EmployeeDashboardResponse)
def get_employee_dashboard(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_roles([models.RoleEnum.employee])),
):
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    manager_employee = aliased(models.Employee)
    manager_user = aliased(models.User)
    projects = (
        db.query(
            models.Project.id,
            models.Project.title,
            models.Project.description,
            models.Project.deadline,
            models.Project.assigned_by,
            manager_user.name.label("assigned_by_name"),
        )
        .outerjoin(manager_employee, manager_employee.id == models.Project.assigned_by)
        .outerjoin(manager_user, manager_user.id == manager_employee.user_id)
        .filter(models.Project.assigned_to == employee.id)
        .order_by(models.Project.id.desc())
        .all()
    )

    skill_links = (
        db.query(models.EmployeeSkill)
        .filter(models.EmployeeSkill.employee_id == employee.id)
        .order_by(models.EmployeeSkill.id.desc())
        .all()
    )
    skills = [
        {
            "id": link.skill.id,
            "name": link.skill.name,
            "type": link.type.value,
        }
        for link in skill_links
        if link.skill is not None
    ]

    last_month_perf = (
        db.query(models.Performance)
        .filter(
            models.Performance.employee_id == employee.id,
            models.Performance.month == _last_month_key(),
        )
        .order_by(models.Performance.id.desc())
        .first()
    )

    latest_manager_rating = (
        db.query(models.Performance)
        .filter(
            models.Performance.employee_id == employee.id,
            models.Performance.manager_id.isnot(None),
        )
        .order_by(models.Performance.date.desc(), models.Performance.id.desc())
        .first()
    )

    latest_report = (
        db.query(models.Report)
        .filter(models.Report.employee_id == employee.id)
        .order_by(models.Report.created_at.desc(), models.Report.id.desc())
        .first()
    )

    return {
        "employee": current_user,
        "projects": [
            {
                "id": project.id,
                "title": project.title,
                "description": project.description,
                "deadline": project.deadline,
                "assigned_by": project.assigned_by,
                "assigned_by_name": project.assigned_by_name,
            }
            for project in projects
        ],
        "skills": skills,
        "performance": last_month_perf,
        "current_rating": latest_manager_rating.rating if latest_manager_rating else None,
        "feedback": latest_manager_rating.feedback if latest_manager_rating else None,
        "report": latest_report,
    }
