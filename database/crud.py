"""
database/crud.py
================
EduAdapt AI — CRUD Operations (Create, Read, Update, Delete)

HOW IT WORKS:
- This file contains all the functions that talk to the database.
- "CRUD" means: Create (INSERT), Read (SELECT), Update (UPDATE), Delete (DELETE).
- Each function receives a "db" session and does one specific database operation.
- The API endpoints (in api/endpoints.py) call these functions.

Think of this file as the "service layer" — the business logic bridge
between your API routes and the raw database tables.
"""

import time
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from database.models import (
    User, StudentRecord, Assignment, ClassTest, StudentRemark,
    Quiz, QuizQuestion, QuizSubmission, StudentGoal,
    QAThread, Internship, Syllabus, SyllabusUnit
)


# ═════════════════════════════════════════════════════════════════════════════
# USER CRUD
# ═════════════════════════════════════════════════════════════════════════════

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower().strip()).first()


def get_all_users(db: Session) -> List[User]:
    return db.query(User).all()


def get_users_by_role(db: Session, role: str) -> List[User]:
    return db.query(User).filter(User.role == role).all()


def get_students_by_dept(db: Session, department: str = None,
                          year: str = None, division: str = None) -> List[User]:
    q = db.query(User).filter(User.role == "student")
    if department:
        q = q.filter(User.department == department)
    if year:
        q = q.filter(User.year == year)
    if division:
        q = q.filter(User.division == division)
    return q.all()


def create_user(db: Session, data: Dict[str, Any]) -> User:
    """Register a new user. Hashes the password automatically."""
    uid = data.get("id") or f"{data.get('role', 'u')[0]}_{int(time.time()*1000)}"
    user = User(
        id=uid,
        role=data["role"],
        name=data["name"],
        email=data["email"].lower().strip(),
        phone=data.get("phone", ""),
        department=data.get("department", ""),
        employee_id=data.get("employeeId", data.get("employee_id", "")),
        prn=data.get("prn", ""),
        year=data.get("year", ""),
        division=data.get("division", ""),
        address=data.get("address", ""),
        parent_name=data.get("parentName", data.get("parent_name", "")),
        parent_phone=data.get("parentPhone", data.get("parent_phone", "")),
        parent_email=data.get("parentEmail", data.get("parent_email", "")),
        linkedin=data.get("linkedin", ""),
        github=data.get("github", ""),
        leetcode=data.get("leetcode", ""),
        hackerrank=data.get("hackerrank", ""),
        subjects=data.get("subjects", []),
    )
    user.set_password(data.get("password", "password123"))
    db.add(user)
    db.flush()  # Get the ID without committing

    # Auto-create blank academic record for students
    if user.role == "student":
        record = StudentRecord(student_id=user.id)
        db.add(record)
        goals = StudentGoal(student_id=user.id)
        db.add(goals)

    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str, role: str) -> Optional[User]:
    """Try email or username prefix login."""
    clean = email.lower().strip()
    # Try full email first
    user = db.query(User).filter(User.email == clean, User.role == role).first()
    # Try email prefix (username without @domain)
    if not user:
        all_role_users = db.query(User).filter(User.role == role).all()
        user = next(
            (u for u in all_role_users if u.email.split("@")[0] == clean),
            None
        )
    if user and user.check_password(password):
        return user
    return None


def update_user(db: Session, user_id: str, data: Dict[str, Any]) -> Optional[User]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    for field in ["name", "phone", "address", "parent_name", "parent_phone",
                  "parent_email", "linkedin", "github", "leetcode", "hackerrank",
                  "subjects", "department", "year", "division"]:
        if field in data:
            setattr(user, field, data[field])
    if "password" in data and data["password"]:
        user.set_password(data["password"])
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: str) -> bool:
    user = get_user_by_id(db, user_id)
    if user:
        db.delete(user)
        db.commit()
        return True
    return False


# ═════════════════════════════════════════════════════════════════════════════
# STUDENT RECORD CRUD
# ═════════════════════════════════════════════════════════════════════════════

def get_student_record(db: Session, student_id: str) -> Optional[StudentRecord]:
    return db.query(StudentRecord).filter(StudentRecord.student_id == student_id).first()


def upsert_student_record(db: Session, student_id: str, data: Dict[str, Any]) -> StudentRecord:
    """Update if exists, create if not."""
    record = get_student_record(db, student_id)
    if not record:
        record = StudentRecord(student_id=student_id)
        db.add(record)

    if "cgpa" in data:
        record.cgpa = data["cgpa"]
    if "attendance" in data:
        record.attendance = str(data["attendance"])
    if "behavior" in data:
        record.behavior = data["behavior"]

    db.commit()
    db.refresh(record)
    return record


def add_assignment(db: Session, student_id: str, data: Dict[str, Any]) -> Assignment:
    record = get_student_record(db, student_id)
    if not record:
        record = StudentRecord(student_id=student_id)
        db.add(record)
        db.flush()

    assignment = Assignment(
        record_id=record.id,
        title=data.get("title", "Untitled"),
        submitted=data.get("submitted", False),
        on_time=data.get("onTime", True),
        marks=data.get("marks", 0),
        max_marks=data.get("maxMarks", 20)
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def add_class_test(db: Session, student_id: str, data: Dict[str, Any]) -> ClassTest:
    record = get_student_record(db, student_id)
    if not record:
        record = StudentRecord(student_id=student_id)
        db.add(record)
        db.flush()

    ct = ClassTest(
        record_id=record.id,
        title=data.get("title", ""),
        marks=data.get("marks", 0),
        max_marks=data.get("maxMarks", 25),
        date=data.get("date", "")
    )
    db.add(ct)
    db.commit()
    db.refresh(ct)
    return ct


def add_remark(db: Session, student_id: str, data: Dict[str, Any]) -> StudentRemark:
    record = get_student_record(db, student_id)
    if not record:
        record = StudentRecord(student_id=student_id)
        db.add(record)
        db.flush()

    remark = StudentRemark(
        record_id=record.id,
        teacher_name=data.get("teacherName", ""),
        text=data.get("text", ""),
        date=data.get("date", datetime.utcnow().strftime("%Y-%m-%d"))
    )
    db.add(remark)
    db.commit()
    db.refresh(remark)
    return remark


# ═════════════════════════════════════════════════════════════════════════════
# QUIZ CRUD
# ═════════════════════════════════════════════════════════════════════════════

def get_all_quizzes(db: Session) -> List[Quiz]:
    return db.query(Quiz).order_by(Quiz.created_at.desc()).all()


def get_quiz_by_id(db: Session, quiz_id: str) -> Optional[Quiz]:
    return db.query(Quiz).filter(Quiz.id == quiz_id).first()


def get_available_quizzes(db: Session, year: str = None,
                           division: str = None, department: str = None) -> List[Quiz]:
    """Filter quizzes matching student's year/division/department."""
    quizzes = get_all_quizzes(db)
    result = []
    for q in quizzes:
        match_year = (not q.target_year or q.target_year in ("All", "") or
                      not year or q.target_year == year)
        match_div  = (not q.target_division or q.target_division in ("All", "") or
                      not division or q.target_division == division)
        if match_year and match_div:
            result.append(q)
    return result


def create_quiz(db: Session, data: Dict[str, Any]) -> Quiz:
    quiz_id = "q_" + str(int(time.time() * 1000))
    quiz = Quiz(
        id=quiz_id,
        title=data["title"],
        subject=data.get("subject", ""),
        target_year=data.get("targetYear", data.get("target_year", "All")),
        target_division=data.get("targetDivision", data.get("target_division", "All")),
        department=data.get("department", ""),
        teacher_id=data.get("teacherId", data.get("teacher_id", "")),
        teacher_name=data.get("teacherName", data.get("teacher_name", "")),
        due_date=data.get("dueDate", data.get("due_date", "")),
        proctored=data.get("proctored", True),
        max_violations=int(data.get("maxViolations", data.get("max_violations", 3)))
    )
    db.add(quiz)
    db.flush()

    for q_data in data.get("questions", []):
        question = QuizQuestion(
            quiz_id=quiz.id,
            q=q_data.get("q", ""),
            opts=q_data.get("opts", []),
            ans=q_data.get("ans", 0),
            concept=q_data.get("concept", ""),
            explanation=q_data.get("explanation", "")
        )
        db.add(question)

    db.commit()
    db.refresh(quiz)
    return quiz


def delete_quiz(db: Session, quiz_id: str) -> bool:
    quiz = get_quiz_by_id(db, quiz_id)
    if quiz:
        db.delete(quiz)
        db.commit()
        return True
    return False


# ═════════════════════════════════════════════════════════════════════════════
# QUIZ SUBMISSIONS CRUD
# ═════════════════════════════════════════════════════════════════════════════

def get_all_submissions(db: Session) -> List[QuizSubmission]:
    return db.query(QuizSubmission).all()


def get_student_submissions(db: Session, student_id: str) -> List[QuizSubmission]:
    return db.query(QuizSubmission).filter(
        QuizSubmission.student_id == student_id
    ).all()


def get_quiz_submissions(db: Session, quiz_id: str) -> List[QuizSubmission]:
    return db.query(QuizSubmission).filter(
        QuizSubmission.quiz_id == quiz_id
    ).all()


def has_submitted(db: Session, quiz_id: str, student_id: str) -> bool:
    return db.query(QuizSubmission).filter(
        QuizSubmission.quiz_id == quiz_id,
        QuizSubmission.student_id == student_id
    ).first() is not None


def submit_quiz(db: Session, data: Dict[str, Any]) -> QuizSubmission:
    sub_id = "s_" + str(int(time.time() * 1000))
    submission = QuizSubmission(
        id=sub_id,
        quiz_id=data["quizId"],
        student_id=data["studentId"],
        score=data.get("score", 0),
        total=data.get("total", 0),
        time_taken_seconds=data.get("timeTakenSeconds", 0),
        answers=data.get("answers", {})
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


# ═════════════════════════════════════════════════════════════════════════════
# STUDENT GOALS CRUD
# ═════════════════════════════════════════════════════════════════════════════

def get_student_goals(db: Session, student_id: str) -> Optional[StudentGoal]:
    return db.query(StudentGoal).filter(StudentGoal.student_id == student_id).first()


def upsert_goals(db: Session, student_id: str, data: Dict[str, Any]) -> StudentGoal:
    goals = get_student_goals(db, student_id)
    if not goals:
        goals = StudentGoal(student_id=student_id)
        db.add(goals)

    goals.target_cgpa     = data.get("targetCgpa", goals.target_cgpa)
    goals.target_accuracy = data.get("targetAccuracy", goals.target_accuracy)
    goals.weekly_hours    = data.get("weeklyHours", goals.weekly_hours)
    goals.target_mastery  = data.get("targetMastery", goals.target_mastery)

    db.commit()
    db.refresh(goals)
    return goals


# ═════════════════════════════════════════════════════════════════════════════
# Q&A CRUD
# ═════════════════════════════════════════════════════════════════════════════

def get_all_qa(db: Session) -> List[QAThread]:
    return db.query(QAThread).order_by(QAThread.created_at.desc()).all()


def get_qa_by_student(db: Session, student_id: str) -> List[QAThread]:
    return db.query(QAThread).filter(QAThread.student_id == student_id).all()


def add_question(db: Session, data: Dict[str, Any]) -> QAThread:
    qa_id = "qa_" + str(int(time.time() * 1000))
    thread = QAThread(
        id=qa_id,
        student_id=data["studentId"],
        student_name=data.get("studentName", ""),
        topic=data.get("topic", ""),
        question=data["question"]
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread


def answer_question(db: Session, qa_id: str, teacher_name: str, answer: str) -> Optional[QAThread]:
    thread = db.query(QAThread).filter(QAThread.id == qa_id).first()
    if thread:
        thread.answer       = answer
        thread.teacher_name = teacher_name
        thread.status       = "resolved"
        thread.answered_at  = datetime.utcnow()
        db.commit()
        db.refresh(thread)
    return thread


# ═════════════════════════════════════════════════════════════════════════════
# INTERNSHIPS CRUD
# ═════════════════════════════════════════════════════════════════════════════

def get_all_internships(db: Session) -> List[Internship]:
    return db.query(Internship).order_by(Internship.created_at.desc()).all()


def create_internship(db: Session, data: Dict[str, Any]) -> Internship:
    intern_id = "intern_" + str(int(time.time() * 1000))
    item = Internship(
        id=intern_id,
        title=data.get("title", "Untitled Internship"),
        company=data.get("company", ""),
        location=data.get("location", "Remote"),
        stipend=data.get("stipend", "Negotiable"),
        deadline=data.get("deadline", ""),
        target_year=data.get("target_year", "All Years"),
        target_div=data.get("target_div", "All Divisions"),
        description=data.get("description", ""),
        apply_url=data.get("apply_url", "#"),
        posted_by=data.get("posted_by", ""),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def delete_internship(db: Session, internship_id: str) -> bool:
    item = db.query(Internship).filter(Internship.id == internship_id).first()
    if item:
        db.delete(item)
        db.commit()
        return True
    return False


# ═════════════════════════════════════════════════════════════════════════════
# SYLLABUS CRUD
# ═════════════════════════════════════════════════════════════════════════════

def get_all_syllabi(db: Session) -> List[Syllabus]:
    return db.query(Syllabus).order_by(Syllabus.created_at.desc()).all()


def get_syllabus_by_id(db: Session, syllabus_id: str) -> Optional[Syllabus]:
    return db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()


def create_syllabus(db: Session, data: Dict[str, Any]) -> Syllabus:
    syl_id = "syl_" + str(int(time.time() * 1000))
    syllabus = Syllabus(
        id=syl_id,
        title=data.get("title", "Untitled Syllabus"),
        department=data.get("department", ""),
        author=data.get("author", "Faculty"),
        code=data.get("code", "CS-101"),
        description=data.get("description", "")
    )
    db.add(syllabus)
    db.flush()

    for u in data.get("units", []):
        unit = SyllabusUnit(
            syllabus_id=syllabus.id,
            unit_id=u.get("unit_id", ""),
            unit_number=u.get("unit_number", 1),
            title=u.get("title", ""),
            description=u.get("description", ""),
            concepts=u.get("concepts", []),
            learning_goals=u.get("learning_goals", [])
        )
        db.add(unit)

    db.commit()
    db.refresh(syllabus)
    return syllabus


# ═════════════════════════════════════════════════════════════════════════════
# LEADERBOARD / ANALYTICS
# ═════════════════════════════════════════════════════════════════════════════

def get_top_students(db: Session, department: str = None,
                     year: str = None, division: str = None) -> List[Dict]:
    """Return students ranked by AI Score Index."""
    students = get_students_by_dept(db, department, year, division)
    result = []
    for s in students:
        record = get_student_record(db, s.id)
        cgpas = [float(v) for v in (record.cgpa or {}).values() if v]
        avg_cgpa = sum(cgpas) / len(cgpas) if cgpas else 0.0

        subs = get_student_submissions(db, s.id)
        quiz_avg = (
            sum(sub.score / max(sub.total, 1) * 100 for sub in subs) / len(subs)
            if subs else 82.0
        )
        attendance = float(record.attendance or 88) if record else 88.0
        ai_score = round(min(100.0, avg_cgpa * 7.5 + quiz_avg * 0.15 + attendance * 0.1), 1)

        result.append({
            **s.to_dict(),
            "avgCgpa": round(avg_cgpa, 2),
            "quizAccuracy": round(quiz_avg),
            "attendance": attendance,
            "aiScoreIndex": ai_score
        })

    result.sort(key=lambda x: x["aiScoreIndex"], reverse=True)
    return result
