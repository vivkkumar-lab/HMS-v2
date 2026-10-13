import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Read database URL from environment variable (Render PostgreSQL support)
database_url = os.getenv("DATABASE_URL") or os.getenv("INTERNAL_DATABASE_URL")

if not database_url:
    # Default to Local PostgreSQL setup by portable installer
    database_url = "postgresql+psycopg2://postgres@127.0.0.1:5432/postgres"

# Normalize PostgreSQL connection URLs to explicitly use psycopg2
# Handles Render/cloud URLs starting with 'postgres://', 'postgresql://', or 'postgresql+psycopg://'
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif database_url.startswith("postgresql+psycopg://"):
    database_url = database_url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
elif database_url.startswith("postgresql://") and not database_url.startswith("postgresql+"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

SQLALCHEMY_DATABASE_URL = database_url

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Enable pool_pre_ping and pool_recycle to handle idle connection drops gracefully in cloud environments
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
