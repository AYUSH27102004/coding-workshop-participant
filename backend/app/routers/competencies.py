from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, auth, schemas

router = APIRouter(prefix="/competencies", tags=["Competencies"])

@router.post("/", response_model=schemas.CompetencyResponse, status_code=status.HTTP_201_CREATED)
def create_competency(comp: schemas.CompetencyCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.require_roles([models.RoleEnum.hr]))):
    # Only HR can manage global competency definitions
    existing = db.query(models.Competency).filter(models.Competency.name == comp.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Competency already exists")
        
    new_comp = models.Competency(**comp.dict())
    db.add(new_comp)
    db.commit()
    db.refresh(new_comp)
    return new_comp

@router.get("/", response_model=List[schemas.CompetencyResponse])
def get_competencies(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Any authenticated user can view the competency dictionary
    return db.query(models.Competency).all()


@router.delete("/{competency_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_competency(
    competency_id: int,
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.require_roles([models.RoleEnum.hr])),
):
    competency = db.query(models.Competency).filter(models.Competency.id == competency_id).first()
    if not competency:
        raise HTTPException(status_code=404, detail="Competency not found")
    db.delete(competency)
    db.commit()
    return None
