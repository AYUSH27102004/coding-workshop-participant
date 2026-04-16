from datetime import date
from app.auth import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models import (
    Competency,
    Department,
    DevelopmentPlan,
    Employee,
    HRDepartment,
    EmployeeSkill,
    EmployeeSkillType,
    Performance,
    Payroll,
    PayrollStatus,
    PerformanceReview,
    Project,
    Recommendation,
    Report,
    RoleEnum,
    Skill,
    User,
)


def _last_month_key() -> str:
    today = date.today()
    year = today.year
    month = today.month - 1
    if month == 0:
        month = 12
        year -= 1
    return f"{year:04d}-{month:02d}"


def seed_demo_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    hashed = get_password_hash("demo123")

    print("Resetting data for deterministic seed...")
    db.query(Recommendation).delete()
    db.query(EmployeeSkill).delete()
    db.query(HRDepartment).delete()
    db.query(Payroll).delete()
    db.query(Performance).delete()
    db.query(Report).delete()
    db.query(Project).delete()
    db.query(PerformanceReview).delete()
    db.query(DevelopmentPlan).delete()
    db.query(Competency).delete()
    db.query(Employee).delete()
    db.query(Skill).delete()
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

    hr_department_links = [
        HRDepartment(hr_id=hr1.id, department_id=department_rows[0].id),  # Engineering
        HRDepartment(hr_id=hr1.id, department_id=department_rows[1].id),  # Sales
        HRDepartment(hr_id=hr2.id, department_id=department_rows[2].id),  # Finance
        HRDepartment(hr_id=hr2.id, department_id=department_rows[3].id),  # Operations
    ]
    db.add_all(hr_department_links)
    db.commit()

    manager_employees = []
    dept_salary_base = {
        "Engineering": 90000,
        "Sales": 70000,
        "Finance": 80000,
        "Operations": 65000,
    }
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
            all_employees.append((employee, manager_emp, dept.name))
            employee_counter += 1

    # Global skill catalog used for employee skill mapping.
    skill_catalog = [
        "Python",
        "SQL",
        "Communication",
        "Project Management",
        "Data Analysis",
        "Leadership",
        "Testing",
        "DevOps",
        "Presentation",
        "Problem Solving",
        "Time Management",
        "API Design",
    ]
    skill_rows = []
    for skill_name in skill_catalog:
        skill = Skill(name=skill_name)
        db.add(skill)
        skill_rows.append(skill)
    db.commit()
    for skill in skill_rows:
        db.refresh(skill)

    for idx, (employee, manager_emp, dept_name) in enumerate(all_employees, start=1):
        project = Project(
            title=f"Project {idx}: Team Goal {idx % 7 + 1}",
            description=f"Employee {idx} owns delivery stream {(idx % 5) + 1} with KPI target {60 + idx % 35}",
            deadline=date(2026, ((idx * 3) % 12) + 1, ((idx * 5) % 27) + 1),
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

        # Unique required/optional skill mapping per employee.
        required_skill = skill_rows[idx % len(skill_rows)]
        optional_skill = skill_rows[(idx + 4) % len(skill_rows)]
        required_link = EmployeeSkill(
            employee_id=employee.id,
            skill_id=required_skill.id,
            type=EmployeeSkillType.required,
        )
        optional_link = EmployeeSkill(
            employee_id=employee.id,
            skill_id=optional_skill.id,
            type=EmployeeSkillType.optional,
        )

        performance = Performance(
            employee_id=employee.id,
            month=_last_month_key(),
            rating=(idx % 5) + 1,
            tasks_completed=8 + (idx % 17),
            feedback=f"Last month: employee {idx} closed {8 + (idx % 17)} tasks and improved metric track {(idx % 6) + 1}",
        )

        # Manager-evaluation rating used by admin and employee manager-rating views.
        if dept_name == "Engineering":
            manager_rating_value = 4 + (idx % 2)  # 4-5 (higher skew)
        elif dept_name == "Sales":
            manager_rating_value = 1 + (idx % 3)  # 1-3 (lower skew)
        elif dept_name == "Finance":
            manager_rating_value = 2 + (idx % 3)  # 2-4 (mid skew)
        else:
            manager_rating_value = 3 + (idx % 3)  # 3-5 (upper-mid skew)

        manager_rating = Performance(
            employee_id=employee.id,
            manager_id=manager_emp.id,
            month=_last_month_key(),
            rating=manager_rating_value,
            tasks_completed=0,
            feedback=f"Manager rating for {dept_name} employee {idx}: outcome band {(idx % 4) + 1}",
            date=date(2026, ((idx + manager_emp.id) % 12) + 1, ((idx * 2) % 27) + 1),
        )

        report = Report(
            employee_id=employee.id,
            summary=f"Monthly report for employee {idx}: output score {70 + (idx % 25)} and quality trend {(idx % 4) + 1}",
            strengths=f"Strengths {idx}: ownership lane {(idx % 5) + 1}, collaboration tier {(idx % 3) + 1}",
            weaknesses=f"Weaknesses {idx}: needs focus on cycle-time bucket {(idx % 4) + 1}",
            suggestions=f"Suggestions {idx}: complete skill sprint {(idx % 6) + 1} and improve planning cadence",
        )

        db.add_all([
            project,
            review,
            plan,
            required_link,
            optional_link,
            performance,
            manager_rating,
            report,
        ])

        salary = dept_salary_base.get(dept_name, 60000) + (idx * 137)
        payroll = Payroll(
            employee_id=employee.id,
            month=_last_month_key(),
            salary=salary,
            status=PayrollStatus.paid if idx % 3 else PayrollStatus.pending,
        )
        db.add(payroll)

    # Payroll records for managers as well.
    for manager_idx, (dept, manager_emp) in enumerate(manager_employees, start=1):
        manager_salary = dept_salary_base.get(dept.name, 70000) + 20000 + (manager_idx * 503)
        manager_payroll = Payroll(
            employee_id=manager_emp.id,
            month=_last_month_key(),
            salary=manager_salary,
            status=PayrollStatus.paid if manager_idx % 2 else PayrollStatus.pending,
        )
        db.add(manager_payroll)

    db.commit()
    db.close()
    print("Seed complete: 4 departments, 4 managers, 40 employees, 1 admin, 2 HR users.")
    print("Created projects, employee skills, performance, and reports with unique employee-level values.")
    print("Demo password for all users: demo123")


if __name__ == "__main__":
    seed_demo_users()
