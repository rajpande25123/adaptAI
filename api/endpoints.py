import os
import pandas as pd
import uvicorn
from typing import Dict, List, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from api.schemas import (
    LearningRequest, LearningResponse, MultimodalDiagnosisRequest,
    AdaptiveQuizGenerateRequest, AdaptiveQuizSubmitRequest, InternshipPostRequest,
    SyllabusCreateRequest, SyllabusQuizGenerateRequest, SyllabusQuizEvaluateRequest
)
from data.internship_store import internship_store
from data.syllabus_store import syllabus_store
from assessment.ai_syllabus_engine import AISyllabusEngine

class EduAdaptAPI:
    def __init__(self, learning_platform):
        self.app = FastAPI(
            title="EduAdapt AI - Multimodal Learning Gap Detector",
            description="AI system for detecting student learning gaps and generating personalized learning interventions.",
            version="2.0.0"
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
        @self.app.get("/health/")
        async def health_check():
            return {
                "status": "healthy",
                "service": "EduAdapt Multimodal AI",
                "version": "2.0.0",
                "timestamp": str(pd.Timestamp.now())
            }

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

        @self.app.post("/recommend-content/")
        async def recommend_content(request: Dict[str, Any]):
            try:
                student_id = request.get('student_id', 'student_001')
                target_concepts = request.get('target_concepts', ['algebra', 'derivatives'])
                max_recommendations = request.get('max_recommendations', 5)

                recommendations = self.platform.get_personalized_recommendations(
                    student_id, target_concepts, max_recommendations
                )

                return JSONResponse(content={
                    'student_id': student_id,
                    'recommendations': recommendations,
                    'timestamp': str(pd.Timestamp.now())
                })
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
                # Convert keys from str to int if needed
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

        @self.app.post("/record-learning-session/")
        async def record_learning_session(request: Dict[str, Any]):
            try:
                student_id = request.get('student_id', 'student_001')
                session_data = request.get('session_data', {})
                self.platform.record_learning_session(student_id, session_data)
                return JSONResponse(content={
                    'status': 'success',
                    'message': 'Learning session recorded',
                    'student_id': student_id
                })
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        # ── INTERNSHIP OPPORTUNITY ENDPOINTS ───────────────────
        @self.app.get("/api/internships/")
        async def list_internships():
            """Fetch real-time list of all active internship opportunities."""
            try:
                internships = internship_store.get_all()
                return JSONResponse(content={"status": "success", "internships": internships})
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/api/internships/")
        async def post_internship(request: InternshipPostRequest):
            """HOD or Teacher posts a new internship opportunity."""
            try:
                item = internship_store.create(request.dict())
                return JSONResponse(content={"status": "success", "message": "Internship posted successfully!", "internship": item})
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.delete("/api/internships/{internship_id}")
        async def delete_internship(internship_id: str):
            """Delete an internship posting."""
            try:
                success = internship_store.delete(internship_id)
                if success:
                    return JSONResponse(content={"status": "success", "message": "Internship deleted"})
                raise HTTPException(status_code=404, detail="Internship not found")
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        # ── SYLLABUS & ADAPTIVE AI REMEDIAL ENDPOINTS ─────────
        @self.app.get("/api/syllabi/")
        async def list_syllabi():
            """Fetch list of all course syllabi."""
            try:
                syllabi = syllabus_store.get_all()
                return JSONResponse(content={"status": "success", "syllabi": syllabi})
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/api/syllabi/")
        async def create_syllabus(request: SyllabusCreateRequest):
            """Create/Add a new course syllabus."""
            try:
                item = syllabus_store.create(request.dict())
                return JSONResponse(content={"status": "success", "message": "Syllabus created successfully!", "syllabus": item})
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/api/syllabi/generate-quiz/")
        async def generate_syllabus_quiz(request: SyllabusQuizGenerateRequest):
            """Generate an AI Quiz automatically for a syllabus unit."""
            try:
                unit = {
                    "unit_id": request.unit_id,
                    "title": request.unit_title,
                    "concepts": request.concepts
                }
                questions = AISyllabusEngine.generate_unit_quiz(unit, request.num_questions)
                return JSONResponse(content={"status": "success", "quiz_questions": questions})
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.post("/api/syllabi/evaluate-remedial/")
        async def evaluate_remedial(request: SyllabusQuizEvaluateRequest):
            """Evaluate quiz answers and auto-generate AI Topic Explanation + Remedial Improvement Quiz."""
            try:
                result = AISyllabusEngine.evaluate_quiz_and_generate_remedial(
                    request.quiz_questions,
                    request.student_answers
                )
                return JSONResponse(content={"status": "success", "result": result})
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))



    def run(self, host: str = "0.0.0.0", port: int = 8000):
        uvicorn.run(self.app, host=host, port=port)