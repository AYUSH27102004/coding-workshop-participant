from sqlalchemy import text
from app.database import engine
from app import models  # noqa: F401
from app.database import Base


def run_migration() -> None:
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline DATE"))


if __name__ == "__main__":
    run_migration()
    print("Employee module migration applied.")
