from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import auth, database, models, schemas

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.post("", response_model=schemas.RecommendationResponse, status_code=status.HTTP_201_CREATED)
def create_recommendation(
    payload: schemas.RecommendationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_roles([models.RoleEnum.manager])),
):
    if current_user.department_id is None:
        raise HTTPException(status_code=400, detail="Manager does not have an assigned department")

    employee = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee_user = db.query(models.User).filter(models.User.id == employee.user_id).first()
    if not employee_user or employee_user.role != models.RoleEnum.employee:
        raise HTTPException(status_code=400, detail="Target must be an employee")

    if employee_user.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Cannot recommend employee of another department")

    recommendation = models.Recommendation(
        manager_id=current_user.id,
        employee_id=employee.id,
        message=payload.message,
    )
    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)
    return {
        "id": recommendation.id,
        "manager_id": recommendation.manager_id,
        "employee_id": recommendation.employee_id,
        "message": recommendation.message,
        "created_at": recommendation.created_at,
        "employee_name": employee_user.name,
        "manager_name": current_user.name,
    }
