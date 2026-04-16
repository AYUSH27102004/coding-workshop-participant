from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base


class RoleEnum(str, enum.Enum):
    admin = "admin"
    hr = "hr"
    manager = "manager"
    employee = "employee"


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)

    users = relationship("User", back_populates="department")
    hr_links = relationship("HRDepartment", back_populates="department")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    department = relationship("Department", back_populates="users")
    employee_profile = relationship("Employee", back_populates="user", uselist=False, foreign_keys="Employee.user_id")
    recommendations_sent = relationship("Recommendation", back_populates="manager")
    handled_departments = relationship("HRDepartment", back_populates="hr_user")


class HRDepartment(Base):
    __tablename__ = "hr_departments"

    id = Column(Integer, primary_key=True, index=True)
    hr_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)

    hr_user = relationship("User", back_populates="handled_departments")
    department = relationship("Department", back_populates="hr_links")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

    user = relationship("User", back_populates="employee_profile", foreign_keys=[user_id])
    manager = relationship("Employee", remote_side=[id], backref="team_members", foreign_keys=[manager_id])

    assigned_projects = relationship("Project", foreign_keys="Project.assigned_to", back_populates="assigned_employee")
    created_projects = relationship("Project", foreign_keys="Project.assigned_by", back_populates="manager_employee")
    performance_reviews = relationship("PerformanceReview", foreign_keys="PerformanceReview.employee_id", back_populates="employee")
    reviews_created = relationship("PerformanceReview", foreign_keys="PerformanceReview.manager_id", back_populates="manager")
    development_plans = relationship("DevelopmentPlan", back_populates="employee")
    skill_links = relationship("EmployeeSkill", back_populates="employee")
    monthly_performance = relationship(
        "Performance",
        back_populates="employee",
        foreign_keys="Performance.employee_id",
    )
    reports = relationship("Report", back_populates="employee")
    recommendations_received = relationship("Recommendation", back_populates="employee")
    payroll_records = relationship("Payroll", back_populates="employee")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    deadline = Column(Date, nullable=True)
    assigned_to = Column(Integer, ForeignKey("employees.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("employees.id"), nullable=False)

    assigned_employee = relationship("Employee", foreign_keys=[assigned_to], back_populates="assigned_projects")
    manager_employee = relationship("Employee", foreign_keys=[assigned_by], back_populates="created_projects")


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    feedback = Column(Text, nullable=False)
    date = Column(Date, nullable=False)

    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="performance_reviews")
    manager = relationship("Employee", foreign_keys=[manager_id], back_populates="reviews_created")


class DevelopmentPlan(Base):
    __tablename__ = "development_plans"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    goal = Column(Text, nullable=False)
    progress = Column(Integer, nullable=False, default=0)
    status = Column(String(60), nullable=False, default="Not Started")

    employee = relationship("Employee", back_populates="development_plans")


class Competency(Base):
    __tablename__ = "competencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)
    description = Column(Text, nullable=True)


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)

    employee_links = relationship("EmployeeSkill", back_populates="skill")


class EmployeeSkillType(str, enum.Enum):
    required = "required"
    optional = "optional"


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    type = Column(Enum(EmployeeSkillType), nullable=False)

    employee = relationship("Employee", back_populates="skill_links")
    skill = relationship("Skill", back_populates="employee_links")


class Performance(Base):
    __tablename__ = "performance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)
    month = Column(String(7), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    tasks_completed = Column(Integer, nullable=False, default=0)
    feedback = Column(Text, nullable=True)
    date = Column(Date, nullable=True)

    employee = relationship("Employee", back_populates="monthly_performance", foreign_keys=[employee_id])


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    summary = Column(Text, nullable=False)
    strengths = Column(Text, nullable=False)
    weaknesses = Column(Text, nullable=False)
    suggestions = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employee = relationship("Employee", back_populates="reports")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    manager = relationship("User", back_populates="recommendations_sent")
    employee = relationship("Employee", back_populates="recommendations_received")


class PayrollStatus(str, enum.Enum):
    paid = "paid"
    pending = "pending"


class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    month = Column(String(7), nullable=False, index=True)
    salary = Column(Integer, nullable=False)
    status = Column(Enum(PayrollStatus), nullable=False, index=True)

    employee = relationship("Employee", back_populates="payroll_records")
