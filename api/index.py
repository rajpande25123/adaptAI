"""
api/index.py
============
EduAdapt AI — Vercel Deployment Entrypoint

WHY THIS FILE EXISTS:
- Vercel looks for a FastAPI `app` variable in specific locations.
- This file is at `api/index.py` which is one of Vercel's expected paths.
- It creates a lightweight version of the app WITHOUT torch/heavy ML models.
  (Torch is 500MB+, Vercel's limit is 250MB — it simply won't fit)

WHAT WORKS ON VERCEL:
  - All user management (register, login, profile)
  - All quizzes (create, take, submit)
  - Academic records, goals, Q&A
  - Internships, syllabi
  - Leaderboard / analytics
  - MCQ bank (pre-written questions)
  - Adaptive remedial evaluation

WHAT IS DISABLED ON VERCEL (torch ML):
  - Deep multimodal AI diagnosis (uses PyTorch neural nets)
  - RL-based learning optimizer
  - Knowledge tracer neural network
  These are research/demo features — the full web platform works completely.
"""

import os
import sys

# Add project root to path so all imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from api.schemas import (
    UserRegisterRequest, UserLoginRequest, UserUpdateRequest,
    StudentRecordUpdateRequest, AssignmentAddRequest, ClassTestAddRequest, RemarkAddRequest,
    QuizCreateRequest, QuizSubmitRequest,
    GoalUpdateRequest, QAAddRequest, QAAnswerRequest,
    InternshipPostRequest, SyllabusCreateRequest,
    SyllabusQuizGenerateRequest, SyllabusQuizEvaluateRequest,
    MultimodalDiagnosisRequest, AdaptiveQuizGenerateRequest, AdaptiveQuizSubmitRequest
)
from database.db import get_db
from database import crud
from assessment.ai_syllabus_engine import AISyllabusEngine

# ─── Initialize Database ───────────────────────────────────────────────────
# On Vercel this runs on cold start. Uses PostgreSQL if DATABASE_URL is set,
# otherwise SQLite (ephemeral on Vercel — set DATABASE_URL to Neon/Supabase).
try:
    from database.init_db import init_db
    init_db()
    print("[EduAdapt] Database initialized OK")
except Exception as e:
    print(f"[EduAdapt] DB init warning: {e}")

# ─── FastAPI App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="EduAdapt AI - Multimodal Learning Gap Detector",
    description="Production-ready AI platform for detecting student learning gaps.",
    version="3.0.0"
)

# Allow all origins for hackathon deployment (tighten for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static Files ──────────────────────────────────────────────────────────
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ─── Page Routes ──────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.get("/dashboard", include_in_schema=False)
async def serve_dashboard():
    return FileResponse(os.path.join(static_dir, "dashboard.html"))

@app.get("/teacher", include_in_schema=False)
async def serve_teacher():
    return FileResponse(os.path.join(static_dir, "teacher.html"))

@app.get("/hod", include_in_schema=False)
async def serve_hod():
    return FileResponse(os.path.join(static_dir, "hod.html"))

# ─── Health ───────────────────────────────────────────────────────────────

@app.get("/health/")
async def health_check():
    return {
        "status": "healthy",
        "service": "EduAdapt AI (Vercel)",
        "version": "3.0.0",
        "database": os.getenv("DATABASE_URL", "sqlite")[:20] + "...",
        "timestamp": str(pd.Timestamp.now())
    }

# ═══════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/users/register/")
async def register_user(request: UserRegisterRequest, db: Session = Depends(get_db)):
    existing = crud.get_user_by_email(db, request.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email address already registered.")
    user = crud.create_user(db, request.dict())
    return JSONResponse(content={"status": "success", "user": user.to_dict()})

@app.post("/api/users/login/")
async def login_user(request: UserLoginRequest, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, request.email, request.password, request.role)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials or role.")
    return JSONResponse(content={"status": "success", "user": user.to_dict()})

@app.get("/api/users/")
async def list_users(role: Optional[str] = None, db: Session = Depends(get_db)):
    users = crud.get_users_by_role(db, role) if role else crud.get_all_users(db)
    return JSONResponse(content={"status": "success", "users": [u.to_dict() for u in users]})

@app.get("/api/users/{user_id}/")
async def get_user(user_id: str, db: Session = Depends(get_db)):
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return JSONResponse(content={"status": "success", "user": user.to_dict()})

@app.put("/api/users/{user_id}/")
async def update_user(user_id: str, request: UserUpdateRequest, db: Session = Depends(get_db)):
    user = crud.update_user(db, user_id, request.dict(exclude_none=True))
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return JSONResponse(content={"status": "success", "user": user.to_dict()})

@app.delete("/api/users/{user_id}/")
async def delete_user(user_id: str, db: Session = Depends(get_db)):
    success = crud.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found.")
    return JSONResponse(content={"status": "success", "message": "User deleted."})

@app.get("/api/students/")
async def list_students(department: Optional[str] = None, year: Optional[str] = None,
                        division: Optional[str] = None, db: Session = Depends(get_db)):
    students = crud.get_students_by_dept(db, department, year, division)
    return JSONResponse(content={"status": "success", "students": [s.to_dict() for s in students]})

@app.post("/api/users/create-teacher/")
async def create_teacher_by_hod(request: UserRegisterRequest, db: Session = Depends(get_db)):
    existing = crud.get_user_by_email(db, request.email)
    if existing:
        raise HTTPException(status_code=409, detail="Teacher with this email already exists.")
    data = request.dict()
    data["role"] = "teacher"
    teacher = crud.create_user(db, data)
    return JSONResponse(content={"status": "success", "teacher": teacher.to_dict()})

# ═══════════════════════════════════════════════════════════════════════════
# STUDENT RECORDS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/records/{student_id}/")
async def get_record(student_id: str, db: Session = Depends(get_db)):
    record = crud.get_student_record(db, student_id)
    if not record:
        return JSONResponse(content={"status": "success", "record": {
            "student_id": student_id,
            "cgpa": {"sem1":"","sem2":"","sem3":"","sem4":"","sem5":"","sem6":""},
            "attendance": "85", "behavior": "Punctual, attentive in class.",
            "assignments": [], "class_tests": [], "remarks": []
        }})
    return JSONResponse(content={"status": "success", "record": record.to_dict()})

@app.put("/api/records/{student_id}/")
async def update_record(student_id: str, request: StudentRecordUpdateRequest, db: Session = Depends(get_db)):
    record = crud.upsert_student_record(db, student_id, request.dict(exclude_none=True))
    return JSONResponse(content={"status": "success", "record": record.to_dict()})

@app.post("/api/records/{student_id}/assignments/")
async def add_assignment(student_id: str, request: AssignmentAddRequest, db: Session = Depends(get_db)):
    a = crud.add_assignment(db, student_id, request.dict())
    return JSONResponse(content={"status": "success", "assignment": a.to_dict()})

@app.post("/api/records/{student_id}/class-tests/")
async def add_class_test(student_id: str, request: ClassTestAddRequest, db: Session = Depends(get_db)):
    ct = crud.add_class_test(db, student_id, request.dict())
    return JSONResponse(content={"status": "success", "class_test": ct.to_dict()})

@app.post("/api/records/{student_id}/remarks/")
async def add_remark(student_id: str, request: RemarkAddRequest, db: Session = Depends(get_db)):
    r = crud.add_remark(db, student_id, request.dict())
    return JSONResponse(content={"status": "success", "remark": r.to_dict()})

# ═══════════════════════════════════════════════════════════════════════════
# QUIZZES
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/quizzes/")
async def list_quizzes(year: Optional[str] = None, division: Optional[str] = None,
                       department: Optional[str] = None, db: Session = Depends(get_db)):
    if year or division or department:
        quizzes = crud.get_available_quizzes(db, year, division, department)
    else:
        quizzes = crud.get_all_quizzes(db)
    return JSONResponse(content={"status": "success", "quizzes": [q.to_dict() for q in quizzes]})

@app.post("/api/quizzes/")
async def create_quiz(request: QuizCreateRequest, db: Session = Depends(get_db)):
    quiz = crud.create_quiz(db, request.dict())
    return JSONResponse(content={"status": "success", "quiz": quiz.to_dict()})

@app.get("/api/quizzes/{quiz_id}/")
async def get_quiz(quiz_id: str, db: Session = Depends(get_db)):
    quiz = crud.get_quiz_by_id(db, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return JSONResponse(content={"status": "success", "quiz": quiz.to_dict()})

@app.delete("/api/quizzes/{quiz_id}/")
async def delete_quiz(quiz_id: str, db: Session = Depends(get_db)):
    success = crud.delete_quiz(db, quiz_id)
    if not success:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return JSONResponse(content={"status": "success", "message": "Quiz deleted."})

# ═══════════════════════════════════════════════════════════════════════════
# SUBMISSIONS
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/submissions/")
async def submit_quiz(request: QuizSubmitRequest, db: Session = Depends(get_db)):
    if crud.has_submitted(db, request.quizId, request.studentId):
        raise HTTPException(status_code=409, detail="Student already submitted this quiz.")
    sub = crud.submit_quiz(db, request.dict())
    return JSONResponse(content={"status": "success", "submission": sub.to_dict()})

@app.get("/api/submissions/student/{student_id}/")
async def get_student_submissions(student_id: str, db: Session = Depends(get_db)):
    subs = crud.get_student_submissions(db, student_id)
    return JSONResponse(content={"status": "success", "submissions": [s.to_dict() for s in subs]})

@app.get("/api/submissions/quiz/{quiz_id}/")
async def get_quiz_submissions(quiz_id: str, db: Session = Depends(get_db)):
    subs = crud.get_quiz_submissions(db, quiz_id)
    return JSONResponse(content={"status": "success", "submissions": [s.to_dict() for s in subs]})

@app.get("/api/submissions/check/{quiz_id}/{student_id}/")
async def check_submitted(quiz_id: str, student_id: str, db: Session = Depends(get_db)):
    submitted = crud.has_submitted(db, quiz_id, student_id)
    return JSONResponse(content={"status": "success", "submitted": submitted})

# ═══════════════════════════════════════════════════════════════════════════
# GOALS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/goals/{student_id}/")
async def get_goals(student_id: str, db: Session = Depends(get_db)):
    goals = crud.get_student_goals(db, student_id)
    if not goals:
        return JSONResponse(content={"status": "success", "goals": {
            "targetCgpa": "9.0", "targetAccuracy": "85", "weeklyHours": "12", "targetMastery": "90"
        }})
    return JSONResponse(content={"status": "success", "goals": goals.to_dict()})

@app.put("/api/goals/{student_id}/")
async def update_goals(student_id: str, request: GoalUpdateRequest, db: Session = Depends(get_db)):
    goals = crud.upsert_goals(db, student_id, request.dict())
    return JSONResponse(content={"status": "success", "goals": goals.to_dict()})

# ═══════════════════════════════════════════════════════════════════════════
# Q&A
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/qa/")
async def list_qa(student_id: Optional[str] = None, db: Session = Depends(get_db)):
    threads = crud.get_qa_by_student(db, student_id) if student_id else crud.get_all_qa(db)
    return JSONResponse(content={"status": "success", "qa": [t.to_dict() for t in threads]})

@app.post("/api/qa/")
async def ask_question(request: QAAddRequest, db: Session = Depends(get_db)):
    thread = crud.add_question(db, request.dict())
    return JSONResponse(content={"status": "success", "qa": thread.to_dict()})

@app.put("/api/qa/{qa_id}/answer/")
async def answer_question(qa_id: str, request: QAAnswerRequest, db: Session = Depends(get_db)):
    thread = crud.answer_question(db, qa_id, request.teacherName, request.answer)
    if not thread:
        raise HTTPException(status_code=404, detail="Q&A thread not found.")
    return JSONResponse(content={"status": "success", "qa": thread.to_dict()})

# ═══════════════════════════════════════════════════════════════════════════
# LEADERBOARD
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/leaderboard/")
async def get_leaderboard(department: Optional[str] = None, year: Optional[str] = None,
                          division: Optional[str] = None, db: Session = Depends(get_db)):
    students = crud.get_top_students(db, department, year, division)
    return JSONResponse(content={"status": "success", "students": students})

# ═══════════════════════════════════════════════════════════════════════════
# INTERNSHIPS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/internships/")
async def list_internships(db: Session = Depends(get_db)):
    from database.models import Internship as InternshipModel
    items = db.query(InternshipModel).order_by(InternshipModel.created_at.desc()).all()
    return JSONResponse(content={"status": "success", "internships": [i.to_dict() for i in items]})

@app.post("/api/internships/")
async def post_internship(request: InternshipPostRequest, db: Session = Depends(get_db)):
    item = crud.create_internship(db, request.dict())
    return JSONResponse(content={"status": "success", "internship": item.to_dict()})

@app.delete("/api/internships/{internship_id}")
async def delete_internship(internship_id: str, db: Session = Depends(get_db)):
    success = crud.delete_internship(db, internship_id)
    if not success:
        raise HTTPException(status_code=404, detail="Internship not found.")
    return JSONResponse(content={"status": "success", "message": "Internship deleted."})

# ═══════════════════════════════════════════════════════════════════════════
# SYLLABI
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/syllabi/")
async def list_syllabi(db: Session = Depends(get_db)):
    syllabi = crud.get_all_syllabi(db)
    return JSONResponse(content={"status": "success", "syllabi": [s.to_dict() for s in syllabi]})

@app.post("/api/syllabi/")
async def create_syllabus(request: SyllabusCreateRequest, db: Session = Depends(get_db)):
    item = crud.create_syllabus(db, request.dict())
    return JSONResponse(content={"status": "success", "syllabus": item.to_dict()})

@app.post("/api/syllabi/generate-quiz/")
async def generate_syllabus_quiz(request: SyllabusQuizGenerateRequest):
    unit = {"unit_id": request.unit_id, "title": request.unit_title, "concepts": request.concepts}
    questions = AISyllabusEngine.generate_unit_quiz(unit, request.num_questions)
    return JSONResponse(content={"status": "success", "quiz_questions": questions})

@app.get("/api/syllabi/random-mcq-quiz/")
async def get_random_mcq_quiz():
    questions = AISyllabusEngine.get_random_mcq_quiz(num_questions=5)
    return JSONResponse(content={"status": "success", "quiz_questions": questions})

@app.post("/api/syllabi/evaluate-remedial/")
async def evaluate_remedial(request: SyllabusQuizEvaluateRequest):
    result = AISyllabusEngine.evaluate_quiz_and_generate_remedial(
        request.quiz_questions, request.student_answers
    )
    return JSONResponse(content={"status": "success", "result": result})

# ═══════════════════════════════════════════════════════════════════════════
# MULTIMODAL AI (lightweight version — no torch)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/multimodal-diagnosis/")
async def run_multimodal_diagnosis(request: MultimodalDiagnosisRequest):
    """Lightweight multimodal diagnosis using sklearn only (no torch)."""
    try:
        from core.multimodal_analyzer import MultimodalGapDetector
        detector = MultimodalGapDetector()
        result = detector.analyze_multimodal_student_state(
            student_id=request.student_id,
            performance_data=request.performance_data,
            behavior_data=request.behavior_data,
            student_question=request.student_question or "",
            assessment_errors=request.assessment_errors or []
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
