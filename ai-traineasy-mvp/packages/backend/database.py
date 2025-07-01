"""
Database models and configuration for AI TrainEasy MVP
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ai_traineasy.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    projects = relationship("Project", back_populates="owner")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, index=True)  # UUID
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="initialized")  # initialized, training, completed, failed
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Foreign Keys
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    datasets = relationship("Dataset", back_populates="project")
    models = relationship("Model", back_populates="project")
    training_runs = relationship("TrainingRun", back_populates="project")

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    file_type = Column(String, nullable=False)  # csv, json
    rows_count = Column(Integer, nullable=True)
    columns_count = Column(Integer, nullable=True)
    schema_json = Column(Text, nullable=True)  # JSON string of schema
    uploaded_at = Column(DateTime, default=func.now())
    
    # Foreign Keys
    project_id = Column(String, ForeignKey("projects.id"))
    
    # Relationships
    project = relationship("Project", back_populates="datasets")

class Model(Base):
    __tablename__ = "models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    model_type = Column(String, nullable=False)  # RandomForest, LightGBM, etc.
    file_path = Column(String, nullable=False)
    accuracy = Column(Float, nullable=True)
    cv_score = Column(Float, nullable=True)
    training_time = Column(Float, nullable=True)  # in seconds
    created_at = Column(DateTime, default=func.now())
    
    # Foreign Keys
    project_id = Column(String, ForeignKey("projects.id"))
    
    # Relationships
    project = relationship("Project", back_populates="models")

class TrainingRun(Base):
    __tablename__ = "training_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    status = Column(String, default="started")  # started, running, completed, failed, paused
    cpu_percent = Column(Integer, default=100)
    use_gpu = Column(Boolean, default=False)
    start_time = Column(DateTime, default=func.now())
    end_time = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    log_file_path = Column(String, nullable=True)
    
    # Foreign Keys
    project_id = Column(String, ForeignKey("projects.id"))
    
    # Relationships
    project = relationship("Project", back_populates="training_runs")

# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Initialize database
def init_db():
    create_tables()
    print("✅ Database initialized successfully")

if __name__ == "__main__":
    init_db()