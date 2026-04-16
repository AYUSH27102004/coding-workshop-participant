from app.database import engine, Base
# Import all models so SQLAlchemy knows about them before creating tables
from app import models 

print("Creating database tables in acme_db...")
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")
