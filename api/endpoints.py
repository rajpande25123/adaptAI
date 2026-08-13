"""
api/endpoints.py
================
EduAdapt AI — FastAPI Route Definitions

WHAT'S NEW (Production Database):
- All user data now comes from SQLite/PostgreSQL database (not localStorage).
- New endpoints for users, records, quizzes, submissions, goals, and Q&A.
- Passwords are bcrypt-hashed — never stored in plain text.
- Any number of students can access simultaneously (thread-safe DB sessions).
"""

import os
import pandas as pd
import uvicorn
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from api.schemas import (
    # Original schemas
    LearningRequest, LearningResponse, MultimodalDiagnosisRequest,
    AdaptiveQuizGenerateRequest, AdaptiveQuizSubmitRequest, InternshipPostRequest,
    SyllabusCreateRequest, SyllabusQuizGenerateRequest, SyllabusQuizEvaluateRequest,
    # New schemas
    UserRegisterRequest, UserLoginRequest, UserUpdateRequest,
    StudentRecordUpdateRequest, AssignmentAddRequest, ClassTestAddRequest, RemarkAddRequest,
    QuizCreateRequest, QuizSubmitRequest,
    GoalUpdateRequest, QAAddRequest, QAAnswerRequest
)
from database.db import get_db
from database import crud
from data.internship_store import internship_store   # kept for backward compat
from data.syllabus_store import syllabus_store       # kept for backward compat
from assessment.ai_syllabus_engine import AISyllabusEngine


class EduAdaptAPI:
    def __init__(self, learning_platform):
        self.app = FastAPI(
            title="EduAdapt AI - Multimodal Learning Gap Detector",
            description="AI system for detecting student learning gaps and generating personalized learning interventions.",
            version="3.0.0"
        )
        self.platform = learning_platform
        self.setup_routes()
        self.setup_static_routes()

    def setup_static_routes(self):
        static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
        if os.path.exists(static_dir):
            self.app.mount("/static", StaticFiles(directory=static_dir), name="static")

            @self.app.get("/", include_in_schema=False)
            async def serve_index():
                return FileResponse(os.path.join(static_dir, "index.html"))

            @self.app.get("/dashboard", include_in_schema=False)
            async def serve_dashboard():
                return FileResponse(os.path.join(static_dir, "dashboard.html"))

            @self.app.get("/teacher", include_in_schema=False)
            async def serve_teacher():
                return FileResponse(os.path.join(static_dir, "teacher.html"))

            @self.app.get("/hod", include_in_schema=False)
            async def serve_hod():
                return FileResponse(os.path.join(static_dir, "hod.html"))

    def setup_routes(self):

        # ── HEALTH ───────────────────────────────────────────────────────────
        @self.app.get("/health/")
        async def health_check():
            return {
                "status": "healthy",
                "service": "EduAdapt Multimodal AI",
                "version": "3.0.0",
                "database": "SQLite (production-ready)",
                "timestamp": str(pd.Timestamp.now())
            }

        # ═════════════════════════════════════════════════════════════════════
        # USER MANAGEMENT
        # ═════════════════════════════════════════════════════════════════════

        @self.app.post("/api/users/register/")
        async def register_user(request: UserRegisterRequest, db: Session = Depends(get_db)):
            """Register a new student, teacher, or HOD."""
            existing = crud.get_user_by_email(db, request.email)
            if existing:
                raise HTTPException(status_code=409, detail="Email address already registered.")
            user = crud.create_user(db, request.dict())
            return JSONResponse(content={"status": "success", "user": user.to_dict()})

        @self.app.post("/api/users/login/")
        async def login_user(request: UserLoginRequest, db: Session = Depends(get_db)):
            """Authenticate a user and return their profile."""
            user = crud.authenticate_user(db, request.email, request.password, request.role)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid credentials or role.")
            return JSONResponse(content={"status": "success", "user": user.to_dict()})

        @self.app.get("/api/users/")
        async def list_users(role: Optional[str] = None, db: Session = Depends(get_db)):
            """List all users (optionally filtered by role)."""
            if role:
                users = crud.get_users_by_role(db, role)
            else:
                users = crud.get_all_users(db)
            return JSONResponse(content={"status": "success", "users": [u.to_dict() for u in users]})

        @self.app.get("/api/users/{user_id}/")
        async def get_user(user_id: str, db: Session = Depends(get_db)):
            """Get a single user by ID."""
            user = crud.get_user_by_id(db, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            return JSONResponse(content={"status": "success", "user": user.to_dict()})

        @self.app.put("/api/users/{user_id}/")
        async def update_user(user_id: str, request: UserUpdateRequest, db: Session = Depends(get_db)):
            """Update user profile fields."""
            user = crud.update_user(db, user_id, request.dict(exclude_none=True))
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            return JSONResponse(content={"status": "success", "user": user.to_dict()})

        @self.app.delete("/api/users/{user_id}/")
        async def delete_user(user_id: str, db: Session = Depends(get_db)):
            """Delete a user account."""
            success = crud.delete_user(db, user_id)
            if not success:
                raise HTTPException(status_code=404, detail="User not found.")
            return JSONResponse(content={"status": "success", "message": "User deleted."})

        @self.app.get("/api/students/")
        async def list_students(department: Optional[str] = None, year: Optional[str] = None,
                                division: Optional[str] = None, db: Session = Depends(get_db)):
            """List students with optional filtering by department/year/division."""
            students = crud.get_students_by_dept(db, department, year, division)
            return JSONResponse(content={"status": "success", "students": [s.to_dict() for s in students]})

        @self.app.post("/api/users/create-teacher/")
        async def create_teacher_by_hod(request: UserRegisterRequest, db: Session = Depends(get_db)):
            """HOD creates a teacher account."""
            existing = crud.get_user_by_email(db, request.email)
            if existing:
                raise HTTPException(status_code=409, detail="Teacher with this email already exists.")
            data = request.dict()
            data["role"] = "teacher"
            teacher = crud.create_user(db, data)
            return JSONResponse(content={"status": "success", "teacher": teacher.to_dict()})

        # ═════════════════════════════════════════════════════════════════════
        # STUDENT RECORDS
        # ═════════════════════════════════════════════════════════════════════

        @self.app.get("/api/records/{student_id}/")
        async def get_record(student_id: str, db: Session = Depends(get_db)):
            """Get a student's full academic record."""
            record = crud.get_student_record(db, student_id)
            if not record:
                # Return blank record rather than 404
                return JSONResponse(content={
                    "status": "success",
                    "record": {
                        "student_id": student_id,
                        "cgpa": {"sem1":"","sem2":"","sem3":"","sem4":"","sem5":"","sem6":""},
                        "attendance": "85", "behavior": "Punctual, attentive in class.",
                        "assignments": [], "class_tests": [], "remarks": []
                    }
                })
            return JSONResponse(content={"status": "success", "record": record.to_dict()})

        @self.app.put("/api/records/{student_id}/")
        async def update_record(student_id: str, request: StudentRecordUpdateRequest,
                                db: Session = Depends(get_db)):
            """Update CGPA, attendance, or behavior for a student."""
            record = crud.upsert_student_record(db, student_id, request.dict(exclude_none=True))
            return JSONResponse(content={"status": "success", "record": record.to_dict()})

        @self.app.post("/api/records/{student_id}/assignments/")
        async def add_assignment(student_id: str, request: AssignmentAddRequest,
                                 db: Session = Depends(get_db)):
            """Add an assignment grade to a student's record."""
            a = crud.add_assignment(db, student_id, request.dict())
            return JSONResponse(content={"status": "success", "assignment": a.to_dict()})

        @self.app.post("/api/records/{student_id}/class-tests/")
        async def add_class_test(student_id: str, request: ClassTestAddRequest,
                                 db: Session = Depends(get_db)):
            """Add a class test result."""
            ct = crud.add_class_test(db, student_id, request.dict())
            return JSONResponse(content={"status": "success", "class_test": ct.to_dict()})

        @self.app.post("/api/records/{student_id}/remarks/")
        async def add_remark(student_id: str, request: RemarkAddRequest,
                             db: Session = Depends(get_db)):
            """Teacher adds a remark on a student."""
            r = crud.add_remark(db, student_id, request.dict())
            return JSONResponse(content={"status": "success", "remark": r.to_dict()})

        # ═════════════════════════════════════════════════════════════════════
        # QUIZZES
        # ═════════════════════════════════════════════════════════════════════

        @self.app.get("/api/quizzes/")
        async def list_quizzes(year: Optional[str] = None, division: Optional[str] = None,
                               department: Optional[str] = None, db: Session = Depends(get_db)):
            """List quizzes (optionally filtered for a specific student cohort)."""
            if year or division or department:
                quizzes = crud.get_available_quizzes(db, year, division, department)
            else:
                quizzes = crud.get_all_quizzes(db)
            return JSONResponse(content={"status": "success", "quizzes": [q.to_dict() for q in quizzes]})

        @self.app.post("/api/quizzes/")
        async def create_quiz(request: QuizCreateRequest, db: Session = Depends(get_db)):
            """Teacher creates a new quiz."""
            quiz = crud.create_quiz(db, request.dict())
            return JSONResponse(content={"status": "success", "quiz": quiz.to_dict()})

        @self.app.get("/api/quizzes/{quiz_id}/")
        async def get_quiz(quiz_id: str, db: Session = Depends(get_db)):
            """Get a specific quiz with all its questions."""
            quiz = crud.get_quiz_by_id(db, quiz_id)
            if not quiz:
                raise HTTPException(status_code=404, detail="Quiz not found.")
            return JSONResponse(content={"status": "success", "quiz": quiz.to_dict()})

        @self.app.delete("/api/quizzes/{quiz_id}/")
        async def delete_quiz(quiz_id: str, db: Session = Depends(get_db)):
            """Delete a quiz."""
            success = crud.delete_quiz(db, quiz_id)
            if not success:
                raise HTTPException(status_code=404, detail="Quiz not found.")
            return JSONResponse(content={"status": "success", "message": "Quiz deleted."})

        # ═════════════════════════════════════════════════════════════════════
        # QUIZ SUBMISSIONS
        # ═════════════════════════════════════════════════════════════════════

        @self.app.post("/api/submissions/")
        async def submit_quiz(request: QuizSubmitRequest, db: Session = Depends(get_db)):
            """Submit a student's quiz attempt."""
            if crud.has_submitted(db, request.quizId, request.studentId):
                raise HTTPException(status_code=409, detail="Student has already submitted this quiz.")
            sub = crud.submit_quiz(db, request.dict())
            return JSONResponse(content={"status": "success", "submission": sub.to_dict()})

        @self.app.get("/api/submissions/student/{student_id}/")
        async def get_student_submissions(student_id: str, db: Session = Depends(get_db)):
            """Get all quiz submissions for a student."""
            subs = crud.get_student_submissions(db, student_id)
            return JSONResponse(content={"status": "success", "submissions": [s.to_dict() for s in subs]})

        @self.app.get("/api/submissions/quiz/{quiz_id}/")
        async def get_quiz_submissions(quiz_id: str, db: Session = Depends(get_db)):
            """Get all student submissions for a quiz (for teacher view)."""
            subs = crud.get_quiz_submissions(db, quiz_id)
            return JSONResponse(content={"status": "success", "submissions": [s.to_dict() for s in subs]})

        @self.app.get("/api/submissions/check/{quiz_id}/{student_id}/")
        async def check_submitted(quiz_id: str, student_id: str, db: Session = Depends(get_db)):
            """Check if a student has already submitted a quiz."""
            submitted = crud.has_submitted(db, quiz_id, student_id)
            return JSONResponse(content={"status": "success", "submitted": submitted})

        # ═════════════════════════════════════════════════════════════════════
        # STUDENT GOALS
        # ═════════════════════════════════════════════════════════════════════

        @self.app.get("/api/goals/{student_id}/")
        async def get_goals(student_id: str, db: Session = Depends(get_db)):
            """Get a student's personal learning goals."""
            goals = crud.get_student_goals(db, student_id)
            if not goals:
                return JSONResponse(content={"status": "success", "goals": {
                    "targetCgpa": "9.0", "targetAccuracy": "85",
                    "weeklyHours": "12", "targetMastery": "90"
                }})
            return JSONResponse(content={"status": "success", "goals": goals.to_dict()})

        @self.app.put("/api/goals/{student_id}/")
        async def update_goals(student_id: str, request: GoalUpdateRequest,
                               db: Session = Depends(get_db)):
            """Update a student's learning goals."""
            goals = crud.upsert_goals(db, student_id, request.dict())
            return JSONResponse(content={"status": "success", "goals": goals.to_dict()})

        # ═════════════════════════════════════════════════════════════════════
        # Q&A DOUBT SYSTEM
        # ═════════════════════════════════════════════════════════════════════

        @self.app.get("/api/qa/")
        async def list_qa(student_id: Optional[str] = None, db: Session = Depends(get_db)):
            """List Q&A threads (all or filtered by student)."""
            if student_id:
                threads = crud.get_qa_by_student(db, student_id)
            else:
                threads = crud.get_all_qa(db)
            return JSONResponse(content={"status": "success", "qa": [t.to_dict() for t in threads]})

        @self.app.post("/api/qa/")
        async def ask_question(request: QAAddRequest, db: Session = Depends(get_db)):
            """Student submits a doubt/question."""
            thread = crud.add_question(db, request.dict())
            return JSONResponse(content={"status": "success", "qa": thread.to_dict()})

        @self.app.put("/api/qa/{qa_id}/answer/")
        async def answer_question(qa_id: str, request: QAAnswerRequest,
                                  db: Session = Depends(get_db)):
            """Teacher answers a student's question."""
            thread = crud.answer_question(db, qa_id, request.teacherName, request.answer)
            if not thread:
                raise HTTPException(status_code=404, detail="Q&A thread not found.")
            return JSONResponse(content={"status": "success", "qa": thread.to_dict()})

        # ═════════════════════════════════════════════════════════════════════
        # ANALYTICS / LEADERBOARD
        # ═════════════════════════════════════════════════════════════════════

        @self.app.get("/api/leaderboard/")
        async def get_leaderboard(department: Optional[str] = None, year: Optional[str] = None,
                                  division: Optional[str] = None, db: Session = Depends(get_db)):
            """Get student leaderboard ranked by AI Score Index."""
            students = crud.get_top_students(db, department, year, division)
            return JSONResponse(content={"status": "success", "students": students})

        # ═════════════════════════════════════════════════════════════════════
        # INTERNSHIPS (now database-backed)
        # ═════════════════════════════════════════════════════════════════════

        @self.app.get("/api/internships/")
        async def list_internships(db: Session = Depends(get_db)):
            """Fetch list of all active internship opportunities."""
            from database.models import Internship as InternshipModel
            items = db.query(InternshipModel).order_by(InternshipModel.created_at.desc()).all()
            return JSONResponse(content={"status": "success", "internships": [i.to_dict() for i in items]})

        @self.app.post("/api/internships/")
        async def post_internship(request: InternshipPostRequest, db: Session = Depends(get_db)):
            """HOD or Teacher posts a new internship opportunity."""
            item = crud.create_internship(db, request.dict())
            return JSONResponse(content={"status": "success", "message": "Internship posted!", "internship": item.to_dict()})

        @self.app.delete("/api/internships/{internship_id}")
        async def delete_internship(internship_id: str, db: Session = Depends(get_db)):
            """Delete an internship posting."""
            success = crud.delete_internship(db, internship_id)
            if not success:
                raise HTTPException(status_code=404, detail="Internship not found.")
            return JSONResponse(content={"status": "success", "message": "Internship deleted."})

        # ═════════════════════════════════════════════════════════════════════
        # SYLLABI (now database-backed)
        # ═════════════════════════════════════════════════════════════════════

        @self.app.get("/api/syllabi/")
        async def list_syllabi(db: Session = Depends(get_db)):
            """Fetch list of all course syllabi."""
            syllabi = crud.get_all_syllabi(db)
            return JSONResponse(content={"status": "success", "syllabi": [s.to_dict() for s in syllabi]})

        @self.app.post("/api/syllabi/")
        async def create_syllabus(request: SyllabusCreateRequest, db: Session = Depends(get_db)):
            """Create/Add a new course syllabus."""
            item = crud.create_syllabus(db, request.dict())
            return JSONResponse(content={"status": "success", "message": "Syllabus created!", "syllabus": item.to_dict()})

        @self.app.post("/api/syllabi/generate-quiz/")
        async def generate_syllabus_quiz(request: SyllabusQuizGenerateRequest):
            """Generate an AI Quiz for a syllabus unit."""
            unit = {"unit_id": request.unit_id, "title": request.unit_title, "concepts": request.concepts}
            questions = AISyllabusEngine.generate_unit_quiz(unit, request.num_questions)
            return JSONResponse(content={"status": "success", "quiz_questions": questions})

        @self.app.get("/api/syllabi/random-mcq-quiz/")
        async def get_random_mcq_quiz():
            """Fetch 5 random MCQs from the MCQ bank."""
            questions = AISyllabusEngine.get_random_mcq_quiz(num_questions=5)
            return JSONResponse(content={"status": "success", "quiz_questions": questions})

        @self.app.post("/api/syllabi/evaluate-remedial/")
        async def evaluate_remedial(request: SyllabusQuizEvaluateRequest):
            """Evaluate quiz answers and generate AI remedial lessons."""
            result = AISyllabusEngine.evaluate_quiz_and_generate_remedial(
                request.quiz_questions, request.student_answers
            )
            return JSONResponse(content={"status": "success", "result": result})

        # ═════════════════════════════════════════════════════════════════════
        # ORIGINAL AI ENDPOINTS (kept unchanged)
        # ═════════════════════════════════════════════════════════════════════

        @self.app.post("/api/multimodal-diagnosis/")
        async def run_multimodal_diagnosis(request: MultimodalDiagnosisRequest):
            try:
                diagnosis = self.platform.run_multimodal_diagnosis(
                    student_id=request.student_id,
                    performance_data=request.performance_data,
                    behavior_data=request.behavior_data,
                    student_question=request.student_question or "",
                    assessment_errors=request.assessment_errors or []
                )
                return JSONResponse(content=diagnosis)
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/api/adaptive-quiz/generate")
        async def generate_adaptive_quiz(request: AdaptiveQuizGenerateRequest):
            try:
                quiz = self.platform.generate_adaptive_quiz(
                    student_id=request.student_id,
                    target_concepts=request.target_concepts,
                    num_questions=request.num_questions
                )
                return JSONResponse(content={
                    "student_id": request.student_id,
                    "target_concepts": request.target_concepts,
                    "quiz_questions": quiz
                })
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/api/adaptive-quiz/submit")
        async def submit_adaptive_quiz(request: AdaptiveQuizSubmitRequest):
            try:
                formatted_answers = {int(k): v for k, v in request.student_answers.items() if k.isdigit()}
                eval_result = self.platform.evaluate_and_record_quiz(
                    student_id=request.student_id,
                    quiz_questions=request.quiz_questions,
                    student_answers=formatted_answers
                )
                return JSONResponse(content=eval_result)
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/student-progress/{student_id}")
        async def get_student_progress(student_id: str):
            try:
                progress = self.platform.get_student_progress(student_id)
                return JSONResponse(content=progress)
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

    def run(self, host: str = "0.0.0.0", port: int = 8000):
        uvicorn.run(self.app, host=host, port=port)