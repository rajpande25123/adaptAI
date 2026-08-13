"""
database/db.py
==============
EduAdapt AI — Database Engine & Session Factory

HOW IT WORKS:
- Uses SQLAlchemy (Python's most popular ORM) to talk to the database.
- In development/free hosting → uses SQLite (a single file: eduadapt.db)
- In production → set DATABASE_URL environment variable to a PostgreSQL URL
  and it will automatically switch. Zero code changes needed!

Think of this file as the "power plug" for the database.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ─── Database URL ────────────────────────────────────────────────────────────
# Reads from environment variable DATABASE_URL.
# If not set, falls back to SQLite file in the project directory.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./eduadapt.db"   # Default: SQLite file in project root
)

# SQLite needs check_same_thread=False to work with FastAPI's async nature.
# PostgreSQL doesn't need this, so we check which DB we're using.
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# ─── Engine ──────────────────────────────────────────────────────────────────
# The "engine" is the actual connection to the database.
# echo=True prints every SQL query to console (useful for debugging; set False in prod)
engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)

# ─── Session Factory ─────────────────────────────────────────────────────────
# Each API request gets its own "session" (a temporary workspace to do DB work).
# autocommit=False → we manually commit (safer, prevents partial saves)
# autoflush=False  → we control when data is sent to DB
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ─── Base ────────────────────────────────────────────────────────────────────
# All ORM model classes will inherit from this Base.
# SQLAlchemy uses it to track which Python classes map to which DB tables.
Base = declarative_base()


def get_db():
    """
    FastAPI Dependency — yields a database session per request.

    Usage in endpoints:
        from database.db import get_db
        from sqlalchemy.orm import Session
        from fastapi import Depends

        @app.get("/something")
        def my_route(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()  # Always close session after request, even if error occurred
