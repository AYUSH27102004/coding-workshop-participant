from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased
from .. import auth, database, models, schemas

router = APIRouter(prefix="/hr", tags=["HR Module"])


def _get_hr_department_ids(db: Session, hr_user_id: int) -> list[int]:
    return [
        row[0]
        for row in (
            db.query(models.HRDepartment.department_id)
            .filter(models.HRDepartment.hr_id == hr_user_id)
            .all()
        )
    ]


@router.get("/dashboard", response_model=schemas.HRDashboardResponse)
def get_hr_dashboard(
    db: Session = Depends(database.get_db),
    current_hr: models.User = Depends(auth.require_roles([models.RoleEnum.hr])),
):
    handled_department_ids = _get_hr_department_ids(db, current_hr.id)
    if not handled_department_ids:
        return {
            "handled_departments": [],
            "department_summaries": [],
            "recommendations": [],
        }

    handled_departments = (
        db.query(models.Department)
        .filter(models.Department.id.in_(handled_department_ids))
        .order_by(models.Department.name.asc())
        .all()
    )

    department_summaries = []
    for department in handled_departments:
        department_employee_rows = (
            db.query(models.Employee.id, models.User.name)
            .join(models.User, models.User.id == models.Employee.user_id)
            .filter(models.User.department_id == department.id, models.User.role == models.RoleEnum.employee)
            .all()
        )

        employee_ids = [row[0] for row in department_employee_rows]
        employee_name_map = {employee_id: name for employee_id, name in department_employee_rows}

        employees_onboarded = len(employee_ids)

        if employee_ids:
            avg_rating = (
                db.query(func.avg(models.Performance.rating))
                .filter(models.Performance.employee_id.in_(employee_ids))
                .scalar()
            )
            average_rating = round(float(avg_rating), 2) if avg_rating is not None else 0.0

            latest_month_subquery = (
                db.query(
                    models.Performance.employee_id.label("employee_id"),
                    func.max(models.Performance.month).label("latest_month"),
                )
                .filter(models.Performance.employee_id.in_(employee_ids))
                .group_by(models.Performance.employee_id)
                .subquery()
            )

            paid_count = (
                db.query(func.count(models.Performance.employee_id.distinct()))
                .join(
                    latest_month_subquery,
                    (models.Performance.employee_id == latest_month_subquery.c.employee_id)
                    & (models.Performance.month == latest_month_subquery.c.latest_month),
                )
                .filter(models.Performance.tasks_completed > 0)
                .scalar()
            )
            payroll_paid_count = int(paid_count or 0)
            payroll_unpaid_count = max(employees_onboarded - payroll_paid_count, 0)

            latest_perf_id_subquery = (
                db.query(
                    models.Performance.employee_id.label("employee_id"),
                    func.max(models.Performance.id).label("latest_perf_id"),
                )
                .filter(models.Performance.employee_id.in_(employee_ids))
                .group_by(models.Performance.employee_id)
                .subquery()
            )

            top_perf = (
                db.query(models.Performance.employee_id, models.Performance.rating)
                .join(
                    latest_perf_id_subquery,
                    models.Performance.id == latest_perf_id_subquery.c.latest_perf_id,
                )
                .order_by(models.Performance.rating.desc(), models.Performance.id.desc())
                .first()
            )

            if top_perf:
                top_performer_name = employee_name_map.get(top_perf.employee_id, "Unknown Employee")
                top_performer_rating = int(top_perf.rating)
            else:
                top_performer_name = None
                top_performer_rating = None
        else:
            average_rating = 0.0
            payroll_paid_count = 0
            payroll_unpaid_count = 0
            top_performer_name = None
            top_performer_rating = None

        department_summaries.append(
            {
                "department_id": department.id,
                "department_name": department.name,
                "employees_onboarded": employees_onboarded,
                "average_rating": average_rating,
                "payroll_paid_count": payroll_paid_count,
                "payroll_unpaid_count": payroll_unpaid_count,
                "top_performer_name": top_performer_name,
                "top_performer_rating": top_performer_rating,
            }
        )

    recommendations = list_recommendations(db=db, current_user=current_hr)

    return {
        "handled_departments": handled_departments,
        "department_summaries": department_summaries,
        "recommendations": recommendations,
    }


@router.get("/recommendations", response_model=list[schemas.HRRecommendationItem])
def list_recommendations(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_roles([models.RoleEnum.hr])),
):
    handled_department_ids = _get_hr_department_ids(db, current_user.id)
    if not handled_department_ids:
        return []

    manager_user = aliased(models.User)
    employee_user = aliased(models.User)

    rows = (
        db.query(
            models.Recommendation.message,
            models.Recommendation.created_at,
            manager_user.name,
            employee_user.name,
        )
        .join(manager_user, manager_user.id == models.Recommendation.manager_id)
        .join(models.Employee, models.Employee.id == models.Recommendation.employee_id)
        .join(employee_user, employee_user.id == models.Employee.user_id)
        .filter(employee_user.department_id.in_(handled_department_ids))
        .order_by(models.Recommendation.created_at.desc(), models.Recommendation.id.desc())
        .all()
    )

    return [
        {
            "employee_name": employee_name,
            "manager_name": manager_name,
            "message": message,
            "timestamp": created_at,
        }
        for message, created_at, manager_name, employee_name in rows
    ]


@router.get("/payroll-status", response_model=list[schemas.HRPayrollStatusItem])
def get_payroll_status(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_roles([models.RoleEnum.hr])),
):
    handled_department_ids = _get_hr_department_ids(db, current_user.id)
    if not handled_department_ids:
        return []

    latest_payroll_subquery = (
        db.query(
            models.Payroll.employee_id.label("employee_id"),
            func.max(models.Payroll.id).label("latest_payroll_id"),
        )
        .group_by(models.Payroll.employee_id)
        .subquery()
    )

    rows = (
        db.query(
            models.User.name,
            models.User.role,
            models.Department.name,
            models.Payroll.status,
        )
        .join(models.Employee, models.Employee.user_id == models.User.id)
        .join(models.Department, models.Department.id == models.User.department_id)
        .join(latest_payroll_subquery, latest_payroll_subquery.c.employee_id == models.Employee.id)
        .join(models.Payroll, models.Payroll.id == latest_payroll_subquery.c.latest_payroll_id)
        .filter(
            models.User.department_id.in_(handled_department_ids),
            models.User.role.in_([models.RoleEnum.employee, models.RoleEnum.manager]),
        )
        .order_by(models.Department.name.asc(), models.User.role.asc(), models.User.name.asc())
        .all()
    )

    return [
        {
            "employee_name": name,
            "role": role.value if hasattr(role, "value") else str(role),
            "department": department_name,
            "salary_status": status.value if hasattr(status, "value") else str(status),
        }
        for name, role, department_name, status in rows
    ]
