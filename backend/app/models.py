from sqlalchemy import Column, Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
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


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
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
