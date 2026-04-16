from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from .models import RoleEnum


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class DepartmentCreate(BaseModel):
    name: str


class DepartmentResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: RoleEnum
    department_id: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: RoleEnum
    department_id: Optional[int] = None

    class Config:
        from_attributes = True


class EmployeeResponse(BaseModel):
    id: int
    user_id: int
    manager_id: Optional[int] = None

    class Config:
        from_attributes = True


class AssignManagerRequest(BaseModel):
    manager_employee_id: int


class ProjectCreate(BaseModel):
    title: str
    description: str
    assigned_to: int


class ProjectResponse(BaseModel):
    id: int
    title: str
    description: str
    assigned_to: int
    assigned_by: int

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    employee_id: int
    rating: int = Field(ge=1, le=5)
    feedback: str
    date: date


class ReviewResponse(BaseModel):
    id: int
    employee_id: int
    manager_id: int
    rating: int
    feedback: str
    date: date

    class Config:
        from_attributes = True


class DevPlanCreate(BaseModel):
    employee_id: int
    goal: str
    progress: int = Field(default=0, ge=0, le=100)
    status: str = "Not Started"


class DevPlanResponse(BaseModel):
    id: int
    employee_id: int
    goal: str
    progress: int
    status: str

    class Config:
        from_attributes = True


class CompetencyCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CompetencyResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
