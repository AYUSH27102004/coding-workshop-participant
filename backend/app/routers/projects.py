from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from .. import auth, database, models, schemas

router = APIRouter(prefix="/projects", tags=["Projects"])


def _project_response_with_names(db: Session, project: models.Project) -> dict:
    assigned_emp = db.query(models.Employee).filter(models.Employee.id == project.assigned_to).first()
    assigned_by_emp = db.query(models.Employee).filter(models.Employee.id == project.assigned_by).first()

    assigned_to_user = db.query(models.User).filter(models.User.id == assigned_emp.user_id).first() if assigned_emp else None
    assigned_by_user = db.query(models.User).filter(models.User.id == assigned_by_emp.user_id).first() if assigned_by_emp else None

    return {
        "id": project.id,
        "title": project.title,
        "description": project.description,
        "deadline": project.deadline,
        "assigned_to": project.assigned_to,
        "assigned_by": project.assigned_by,
        "assigned_to_name": assigned_to_user.name if assigned_to_user else None,
        "assigned_by_name": assigned_by_user.name if assigned_by_user else None,
    }


@router.post("", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_roles([models.RoleEnum.manager])),
):
    if current_user.department_id is None:
        raise HTTPException(status_code=400, detail="Manager does not have an assigned department")

    manager_employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not manager_employee:
        raise HTTPException(status_code=404, detail="Manager employee profile not found")

    target_employee = db.query(models.Employee).filter(models.Employee.id == payload.assigned_to).first()
    if not target_employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    target_user = db.query(models.User).filter(models.User.id == target_employee.user_id).first()
    if not target_user or target_user.role != models.RoleEnum.employee:
        raise HTTPException(status_code=400, detail="Assigned user must be an employee")

    if target_user.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Cannot assign project to employee of another department")

    project = models.Project(
        title=payload.title,
        description=payload.description,
        deadline=payload.deadline,
        assigned_to=payload.assigned_to,
        assigned_by=manager_employee.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _project_response_with_names(db, project)


@router.get("", response_model=List[schemas.ProjectResponse])
def get_projects(
    status: Optional[str] = Query(default=None),
    deadline: Optional[str] = Query(default=None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = (
        db.query(models.Project)
        .join(models.Employee, models.Employee.id == models.Project.assigned_to)
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
        employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if not employee:
            return []
        query = query.filter(models.Project.assigned_to == employee.id)

    if status:
        normalized_status = status.strip().lower()
        today = date.today()
        if normalized_status == "pending":
            query = query.filter(or_(models.Project.deadline.is_(None), models.Project.deadline >= today))
        elif normalized_status == "completed":
            query = query.filter(models.Project.deadline < today)
        else:
            raise HTTPException(status_code=400, detail="Invalid project status filter")

    if deadline:
        normalized_deadline = deadline.strip().lower()
        today = date.today()
        if normalized_deadline == "overdue":
            query = query.filter(models.Project.deadline.is_not(None), models.Project.deadline < today)
        elif normalized_deadline == "upcoming":
            upcoming_limit = today + timedelta(days=7)
            query = query.filter(
                and_(
                    models.Project.deadline.is_not(None),
                    models.Project.deadline >= today,
                    models.Project.deadline <= upcoming_limit,
                )
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid project deadline filter")

    projects = query.all()
    return [_project_response_with_names(db, project) for project in projects]
