"""
database/models.py
==================
EduAdapt AI — SQLAlchemy ORM Models (Database Table Definitions)

HOW IT WORKS:
- Each Python class here = one table in the database.
- Each class attribute = one column in that table.
- SQLAlchemy reads these and creates the actual SQL tables for you.
- Relationships (ForeignKey) link tables together, just like real SQL.

TABLE OVERVIEW:
  users              → all users: students, teachers, HODs
  student_records    → CGPA, attendance, behavior per student
  assignments        → student assignment grades
  class_tests        → class test scores
  student_remarks    → teacher remarks on a student
  quizzes            → quiz definitions (created by teachers)
  quiz_questions     → individual MCQ questions in a quiz
  quiz_submissions   → a student's completed quiz attempt
  student_goals      → personal learning goals per student
  qa_threads         → Q&A doubt questions from students
  internships        → internship postings
  syllabi            → course syllabi
  syllabus_units     → individual units inside a syllabus
"""

import bcrypt
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from database.db import Base


# ─────────────────────────────────────────────────────────────────────────────
# USERS
# Stores all platform users: students, teachers, HODs.
# ─────────────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    # Primary Key — unique string ID (e.g., "stu_123", "t_456", "hod_789")
    id            = Column(String, primary_key=True, index=True)
    role          = Column(String, nullable=False)        # 'student' | 'teacher' | 'hod'
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)       # NEVER store plain text!

    # Common fields
    phone         = Column(String, default="")
    department    = Column(String, default="")
    employee_id   = Column(String, default="")           # for teachers/HODs

    # Student-only fields
    prn           = Column(String, default="")
    year          = Column(String, default="")           # FY, SY, TY
    division      = Column(String, default="")           # A, B
    address       = Column(String, default="")
    parent_name   = Column(String, default="")
    parent_phone  = Column(String, default="")
    parent_email  = Column(String, default="")
    linkedin      = Column(String, default="")
    github        = Column(String, default="")
    leetcode      = Column(String, default="")
    hackerrank    = Column(String, default="")

    # Teacher-only fields
    subjects      = Column(JSON, default=list)           # list of subject names

    created_at    = Column(DateTime, default=datetime.utcnow)

    # ─── Relationships (SQLAlchemy lazy-loads related rows) ───────────────
    record        = relationship("StudentRecord", back_populates="student",
                                 uselist=False, cascade="all, delete-orphan")
    goals         = relationship("StudentGoal",  back_populates="student",
                                 uselist=False, cascade="all, delete-orphan")
    submissions   = relationship("QuizSubmission", back_populates="student",
                                 cascade="all, delete-orphan")
    qa_questions  = relationship("QAThread", back_populates="student",
                                 foreign_keys="QAThread.student_id",
                                 cascade="all, delete-orphan")
    quizzes_created = relationship("Quiz", back_populates="teacher",
                                   cascade="all, delete-orphan")

    # ─── Password helpers ─────────────────────────────────────────────────
    def set_password(self, plain_password: str):
        """Hash the password using bcrypt before saving."""
        self.password_hash = bcrypt.hashpw(
            plain_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, plain_password: str) -> bool:
        """Verify a plain password against the stored hash."""
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            self.password_hash.encode("utf-8")
        )

    def to_dict(self):
        return {
            "id": self.id, "role": self.role, "name": self.name,
            "email": self.email, "phone": self.phone,
            "department": self.department, "employee_id": self.employee_id,
            "prn": self.prn, "year": self.year, "division": self.division,
            "address": self.address, "parent_name": self.parent_name,
            "parent_phone": self.parent_phone, "parent_email": self.parent_email,
            "linkedin": self.linkedin, "github": self.github,
            "leetcode": self.leetcode, "hackerrank": self.hackerrank,
            "subjects": self.subjects or [],
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT RECORD  (one per student)
# ─────────────────────────────────────────────────────────────────────────────
class StudentRecord(Base):
    __tablename__ = "student_records"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"),
                        unique=True, nullable=False)

    # CGPA per semester stored as JSON: {"sem1": "8.4", "sem2": "8.1", ...}
    cgpa       = Column(JSON, default=lambda: {
        "sem1": "", "sem2": "", "sem3": "", "sem4": "", "sem5": "", "sem6": ""
    })
    attendance = Column(String, default="85")
    behavior   = Column(Text, default="Punctual, attentive in class.")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student    = relationship("User", back_populates="record")
    assignments = relationship("Assignment", back_populates="record",
                               cascade="all, delete-orphan")
    class_tests = relationship("ClassTest", back_populates="record",
                               cascade="all, delete-orphan")
    remarks    = relationship("StudentRemark", back_populates="record",
                              cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "student_id": self.student_id,
            "cgpa": self.cgpa or {},
            "attendance": self.attendance,
            "behavior": self.behavior,
            "assignments": [a.to_dict() for a in (self.assignments or [])],
            "class_tests": [c.to_dict() for c in (self.class_tests or [])],
            "remarks": [r.to_dict() for r in (self.remarks or [])],
        }


# ─────────────────────────────────────────────────────────────────────────────
# ASSIGNMENTS
# ─────────────────────────────────────────────────────────────────────────────
class Assignment(Base):
    __tablename__ = "assignments"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("student_records.id", ondelete="CASCADE"))
    title     = Column(String, nullable=False)
    submitted = Column(Boolean, default=False)
    on_time   = Column(Boolean, default=True)
    marks     = Column(Integer, default=0)
    max_marks = Column(Integer, default=20)

    record    = relationship("StudentRecord", back_populates="assignments")

    def to_dict(self):
        return {
            "id": self.id, "title": self.title,
            "submitted": self.submitted, "onTime": self.on_time,
            "marks": self.marks, "maxMarks": self.max_marks
        }


# ─────────────────────────────────────────────────────────────────────────────
# CLASS TESTS
# ─────────────────────────────────────────────────────────────────────────────
class ClassTest(Base):
    __tablename__ = "class_tests"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("student_records.id", ondelete="CASCADE"))
    title     = Column(String, nullable=False)
    marks     = Column(Integer, default=0)
    max_marks = Column(Integer, default=25)
    date      = Column(String, default="")

    record    = relationship("StudentRecord", back_populates="class_tests")

    def to_dict(self):
        return {
            "id": self.id, "title": self.title,
            "marks": self.marks, "maxMarks": self.max_marks, "date": self.date
        }


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT REMARKS  (teacher writes remarks on student)
# ─────────────────────────────────────────────────────────────────────────────
class StudentRemark(Base):
    __tablename__ = "student_remarks"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    record_id    = Column(Integer, ForeignKey("student_records.id", ondelete="CASCADE"))
    teacher_name = Column(String, default="")
    text         = Column(Text, default="")
    date         = Column(String, default="")

    record       = relationship("StudentRecord", back_populates="remarks")

    def to_dict(self):
        return {"teacherName": self.teacher_name, "text": self.text, "date": self.date}


# ─────────────────────────────────────────────────────────────────────────────
# QUIZZES  (created by teachers)
# ─────────────────────────────────────────────────────────────────────────────
class Quiz(Base):
    __tablename__ = "quizzes"

    id             = Column(String, primary_key=True, index=True)
    title          = Column(String, nullable=False)
    subject        = Column(String, default="")
    target_year    = Column(String, default="All")        # FY, SY, TY, All
    target_division = Column(String, default="All")       # A, B, All
    department     = Column(String, default="")
    teacher_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    teacher_name   = Column(String, default="")
    due_date       = Column(String, default="")
    proctored      = Column(Boolean, default=True)
    max_violations = Column(Integer, default=3)
    created_at     = Column(DateTime, default=datetime.utcnow)

    teacher     = relationship("User", back_populates="quizzes_created")
    questions   = relationship("QuizQuestion", back_populates="quiz",
                               cascade="all, delete-orphan")
    submissions = relationship("QuizSubmission", back_populates="quiz",
                               cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "subject": self.subject,
            "targetYear": self.target_year, "targetDivision": self.target_division,
            "department": self.department, "teacherId": self.teacher_id,
            "teacherName": self.teacher_name, "dueDate": self.due_date,
            "proctored": self.proctored, "maxViolations": self.max_violations,
            "questions": [q.to_dict() for q in (self.questions or [])],
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


# ─────────────────────────────────────────────────────────────────────────────
# QUIZ QUESTIONS  (MCQ options per quiz)
# ─────────────────────────────────────────────────────────────────────────────
class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id      = Column(Integer, primary_key=True, autoincrement=True)
    quiz_id = Column(String, ForeignKey("quizzes.id", ondelete="CASCADE"))
    q       = Column(Text, nullable=False)           # question text
    opts    = Column(JSON, nullable=False)            # list of 4 options
    ans     = Column(Integer, nullable=False)         # index of correct option (0-3)
    concept = Column(String, default="")             # concept tag e.g. "optimization"
    explanation = Column(Text, default="")

    quiz    = relationship("Quiz", back_populates="questions")

    def to_dict(self):
        return {
            "id": self.id, "q": self.q, "opts": self.opts,
            "ans": self.ans, "concept": self.concept,
            "explanation": self.explanation
        }


# ─────────────────────────────────────────────────────────────────────────────
# QUIZ SUBMISSIONS  (a student's completed quiz)
# ─────────────────────────────────────────────────────────────────────────────
class QuizSubmission(Base):
    __tablename__ = "quiz_submissions"

    id                = Column(String, primary_key=True, index=True)
    quiz_id           = Column(String, ForeignKey("quizzes.id", ondelete="CASCADE"))
    student_id        = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    score             = Column(Integer, default=0)
    total             = Column(Integer, default=0)
    time_taken_seconds = Column(Integer, default=0)
    answers           = Column(JSON, default=dict)   # {question_index: chosen_option}
    submitted_at      = Column(DateTime, default=datetime.utcnow)

    quiz    = relationship("Quiz", back_populates="submissions")
    student = relationship("User", back_populates="submissions")

    def to_dict(self):
        return {
            "id": self.id, "quizId": self.quiz_id, "studentId": self.student_id,
            "score": self.score, "total": self.total,
            "timeTakenSeconds": self.time_taken_seconds,
            "answers": self.answers,
            "submittedAt": self.submitted_at.isoformat() if self.submitted_at else None
        }


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT GOALS  (one per student)
# ─────────────────────────────────────────────────────────────────────────────
class StudentGoal(Base):
    __tablename__ = "student_goals"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    student_id      = Column(String, ForeignKey("users.id", ondelete="CASCADE"),
                             unique=True, nullable=False)
    target_cgpa     = Column(String, default="9.0")
    target_accuracy = Column(String, default="85")
    weekly_hours    = Column(String, default="12")
    target_mastery  = Column(String, default="90")

    student = relationship("User", back_populates="goals")

    def to_dict(self):
        return {
            "studentId": self.student_id,
            "targetCgpa": self.target_cgpa,
            "targetAccuracy": self.target_accuracy,
            "weeklyHours": self.weekly_hours,
            "targetMastery": self.target_mastery
        }


# ─────────────────────────────────────────────────────────────────────────────
# Q&A THREADS  (student asks question, teacher answers)
# ─────────────────────────────────────────────────────────────────────────────
class QAThread(Base):
    __tablename__ = "qa_threads"

    id           = Column(String, primary_key=True, index=True)
    student_id   = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    student_name = Column(String, default="")
    topic        = Column(String, default="")
    question     = Column(Text, nullable=False)
    answer       = Column(Text, default="")
    teacher_name = Column(String, default="")
    status       = Column(String, default="pending")   # 'pending' | 'resolved'
    created_at   = Column(DateTime, default=datetime.utcnow)
    answered_at  = Column(DateTime, nullable=True)

    student = relationship("User", back_populates="qa_questions",
                           foreign_keys=[student_id])

    def to_dict(self):
        return {
            "id": self.id, "studentId": self.student_id,
            "studentName": self.student_name, "topic": self.topic,
            "question": self.question, "answer": self.answer,
            "teacherName": self.teacher_name, "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "answeredAt": self.answered_at.isoformat() if self.answered_at else None
        }


# ─────────────────────────────────────────────────────────────────────────────
# INTERNSHIPS
# ─────────────────────────────────────────────────────────────────────────────
class Internship(Base):
    __tablename__ = "internships"

    id          = Column(String, primary_key=True, index=True)
    title       = Column(String, nullable=False)
    company     = Column(String, default="")
    location    = Column(String, default="Remote")
    stipend     = Column(String, default="Negotiable")
    deadline    = Column(String, default="")
    target_year = Column(String, default="All Years")
    target_div  = Column(String, default="All Divisions")
    description = Column(Text, default="")
    apply_url   = Column(String, default="#")
    posted_by   = Column(String, default="")
    created_at  = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "company": self.company,
            "location": self.location, "stipend": self.stipend,
            "deadline": self.deadline, "target_year": self.target_year,
            "target_div": self.target_div, "description": self.description,
            "apply_url": self.apply_url, "posted_by": self.posted_by,
            "timestamp": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else ""
        }


# ─────────────────────────────────────────────────────────────────────────────
# SYLLABI  (course curriculum documents)
# ─────────────────────────────────────────────────────────────────────────────
class Syllabus(Base):
    __tablename__ = "syllabi"

    id          = Column(String, primary_key=True, index=True)
    title       = Column(String, nullable=False)
    department  = Column(String, default="")
    author      = Column(String, default="")
    code        = Column(String, default="")
    description = Column(Text, default="")
    created_at  = Column(DateTime, default=datetime.utcnow)

    units = relationship("SyllabusUnit", back_populates="syllabus",
                         order_by="SyllabusUnit.unit_number",
                         cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "department": self.department,
            "author": self.author, "code": self.code, "description": self.description,
            "units": [u.to_dict() for u in (self.units or [])],
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else ""
        }


# ─────────────────────────────────────────────────────────────────────────────
# SYLLABUS UNITS
# ─────────────────────────────────────────────────────────────────────────────
class SyllabusUnit(Base):
    __tablename__ = "syllabus_units"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    syllabus_id    = Column(String, ForeignKey("syllabi.id", ondelete="CASCADE"))
    unit_id        = Column(String, default="")
    unit_number    = Column(Integer, default=1)
    title          = Column(String, nullable=False)
    description    = Column(Text, default="")
    concepts       = Column(JSON, default=list)
    learning_goals = Column(JSON, default=list)

    syllabus = relationship("Syllabus", back_populates="units")

    def to_dict(self):
        return {
            "unit_id": self.unit_id or str(self.id),
            "unit_number": self.unit_number, "title": self.title,
            "description": self.description,
            "concepts": self.concepts or [],
            "learning_goals": self.learning_goals or []
        }
