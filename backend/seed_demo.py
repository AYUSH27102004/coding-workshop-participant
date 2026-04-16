from datetime import date
from app.auth import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models import Department, DevelopmentPlan, Employee, PerformanceReview, Project, RoleEnum, User


def seed_demo_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    hashed = get_password_hash("demo123")

    print("Resetting data for deterministic seed...")
    db.query(Project).delete()
    db.query(PerformanceReview).delete()
    db.query(DevelopmentPlan).delete()
    db.query(Employee).delete()
    db.query(User).delete()
    db.query(Department).delete()
    db.commit()

    departments = ["Engineering", "Sales", "Finance", "Operations"]
    department_rows = []
    for name in departments:
        d = Department(name=name)
        db.add(d)
        department_rows.append(d)
    db.commit()

    for d in department_rows:
        db.refresh(d)

    admin = User(name="System Admin", email="admin@acme.com", password=hashed, role=RoleEnum.admin, department_id=department_rows[0].id)
    hr1 = User(name="HR Lead", email="hr1@acme.com", password=hashed, role=RoleEnum.hr, department_id=department_rows[3].id)
    hr2 = User(name="HR Analyst", email="hr2@acme.com", password=hashed, role=RoleEnum.hr, department_id=department_rows[3].id)
    db.add_all([admin, hr1, hr2])
    db.commit()

    manager_employees = []
    for idx, dept in enumerate(department_rows, start=1):
        manager_user = User(
            name=f"{dept.name} Manager",
            email=f"manager{idx}@acme.com",
            password=hashed,
            role=RoleEnum.manager,
            department_id=dept.id,
        )
        db.add(manager_user)
        db.commit()
        db.refresh(manager_user)

        manager_emp = Employee(user_id=manager_user.id, manager_id=None)
        db.add(manager_emp)
        db.commit()
        db.refresh(manager_emp)
        manager_employees.append((dept, manager_emp))

    employee_counter = 1
    all_employees = []
    for dept, manager_emp in manager_employees:
        for _ in range(10):
            user = User(
                name=f"{dept.name} Employee {employee_counter}",
                email=f"employee{employee_counter}@acme.com",
                password=hashed,
                role=RoleEnum.employee,
                department_id=dept.id,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            employee = Employee(user_id=user.id, manager_id=manager_emp.id)
            db.add(employee)
            db.commit()
            db.refresh(employee)
            all_employees.append((employee, manager_emp))
            employee_counter += 1

    for idx, (employee, manager_emp) in enumerate(all_employees, start=1):
        project = Project(
            title=f"Project {idx}",
            description=f"Deliver milestone {idx} for quarterly goals",
            assigned_to=employee.id,
            assigned_by=manager_emp.id,
        )
        review = PerformanceReview(
            employee_id=employee.id,
            manager_id=manager_emp.id,
            rating=(idx % 5) + 1,
            feedback=f"Review feedback for employee {idx}",
            date=date(2026, ((idx % 12) + 1), ((idx % 27) + 1)),
        )
        plan = DevelopmentPlan(
            employee_id=employee.id,
            goal=f"Development goal for employee {idx}",
            progress=(idx * 7) % 100,
            status="In Progress" if idx % 3 else "Not Started",
        )
        db.add_all([project, review, plan])

    db.commit()
    db.close()
    print("Seed complete: 4 departments, 4 managers, 40 employees, 1 admin, 2 HR users.")
    print("Demo password for all users: demo123")


if __name__ == "__main__":
    seed_demo_users()
