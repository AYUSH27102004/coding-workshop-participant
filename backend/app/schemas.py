from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from .models import RoleEnum


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[RoleEnum] = None


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
    deadline: Optional[date] = None
    assigned_to: int


class ProjectResponse(BaseModel):
    id: int
    title: str
    description: str
    deadline: Optional[date] = None
    assigned_to: int
    assigned_by: int
    assigned_to_name: Optional[str] = None
    assigned_by_name: Optional[str] = None

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
    employee_name: Optional[str] = None
    manager_name: Optional[str] = None

    class Config:
        from_attributes = True


class RatingCreate(BaseModel):
    employee_id: int
    rating: int = Field(ge=1, le=5)
    feedback: Optional[str] = None


class RatingResponse(BaseModel):
    id: int
    employee_id: int
    manager_id: int
    rating: int
    feedback: Optional[str] = None
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
    employee_name: Optional[str] = None

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


class EmployeeDashboardProject(BaseModel):
    id: int
    title: str
    description: str
    deadline: Optional[date] = None
    assigned_by: int
    assigned_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class EmployeeDashboardSkill(BaseModel):
    id: int
    name: str
    type: str


class EmployeeDashboardPerformance(BaseModel):
    month: str
    rating: int
    tasks_completed: int
    feedback: str

    class Config:
        from_attributes = True


class EmployeeDashboardReport(BaseModel):
    summary: str
    strengths: str
    weaknesses: str
    suggestions: str

    class Config:
        from_attributes = True


class EmployeeDashboardResponse(BaseModel):
    employee: UserResponse
    projects: list[EmployeeDashboardProject]
    skills: list[EmployeeDashboardSkill]
    performance: Optional[EmployeeDashboardPerformance] = None
    current_rating: Optional[int] = None
    feedback: Optional[str] = None
    report: Optional[EmployeeDashboardReport] = None


class ManagerDashboardManagerInfo(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: RoleEnum
    department_id: int

    class Config:
        from_attributes = True



class TopPerformerItem(BaseModel):
    name: str
    rating: int


class DepartmentPerformanceTrendItem(BaseModel):
    month: str
    average_rating: float


class TeamAverageRatingItem(BaseModel):
    employee_name: str
    average_rating: float


class ManagerDashboardResponse(BaseModel):
    manager: ManagerDashboardManagerInfo
    department_name: str
    team_size: int
    pending_projects_count: int
    underperforming_count: int
    underperforming_employees: list[str]
    top_performers: list[TopPerformerItem]
    team_average_ratings: list[TeamAverageRatingItem]
    department_performance_trend: list[DepartmentPerformanceTrendItem]
    trend_status: str


class RecommendationCreate(BaseModel):
    employee_id: int
    message: str = Field(min_length=3)


class RecommendationResponse(BaseModel):
    id: int
    manager_id: int
    employee_id: int
    message: str
    created_at: datetime
    employee_name: Optional[str] = None
    manager_name: Optional[str] = None

    class Config:
        from_attributes = True


class HRRecommendationItem(BaseModel):
    employee_name: str
    manager_name: str
    message: str
    timestamp: datetime


class HRDepartmentSummaryItem(BaseModel):
    department_id: int
    department_name: str
    employees_onboarded: int
    average_rating: float
    payroll_paid_count: int
    payroll_unpaid_count: int
    top_performer_name: Optional[str] = None
    top_performer_rating: Optional[int] = None


class HRDashboardResponse(BaseModel):
    handled_departments: list[DepartmentResponse]
    department_summaries: list[HRDepartmentSummaryItem]
    recommendations: list[HRRecommendationItem]


class HRPayrollStatusItem(BaseModel):
    employee_name: str
    role: str
    department: str
    salary_status: str


class AdminDepartmentOverviewItem(BaseModel):
    department_name: str
    avg_manager_rating: float
    avg_performance_score: float
    projects_on_time: int
    projects_delayed: int
    completion_rate: float
