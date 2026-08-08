from pydantic import BaseModel
from typing import Dict, List, Any, Optional

class LearningRequest(BaseModel):
    student_id: str
    target_concepts: List[str]
    max_recommendations: Optional[int] = 5

class LearningResponse(BaseModel):
    student_id: str
    recommendations: List[Dict[str, Any]]
    timestamp: str

class MultimodalDiagnosisRequest(BaseModel):
    student_id: str = "student_001"
    performance_data: Dict[str, float] = {
        "algebra": 0.85,
        "linear_equations": 0.70,
        "derivatives": 0.40,
        "partial_derivatives": 0.25,
        "optimization": 0.20
    }
    behavior_data: Dict[str, Any] = {
        "time_spent": 520,
        "focus_index": 0.65,
        "interaction_count": 8,
        "learning_style": "visual"
    }
    student_question: Optional[str] = "Why is the gradient vector zero at local minima during gradient descent?"
    assessment_errors: Optional[List[Dict[str, Any]]] = [
        {"concept": "partial_derivatives", "type": "foundational_gap"},
        {"concept": "optimization", "type": "conceptual_misconception"}
    ]

class AdaptiveQuizGenerateRequest(BaseModel):
    student_id: str = "student_001"
    target_concepts: List[str] = ["optimization", "partial_derivatives"]
    num_questions: int = 5

class AdaptiveQuizSubmitRequest(BaseModel):
    student_id: str = "student_001"
    quiz_questions: List[Dict[str, Any]]
    student_answers: Dict[str, Any]

class InternshipPostRequest(BaseModel):
    title: str
    company: str
    location: Optional[str] = "Remote / Hybrid"
    stipend: Optional[str] = "Stipend Provided"
    deadline: Optional[str] = "2026-12-31"
    target_year: Optional[str] = "All Years"
    target_div: Optional[str] = "All Divisions"
    description: str
    apply_url: Optional[str] = "#"
    posted_by: Optional[str] = "Faculty / HOD"

class SyllabusCreateRequest(BaseModel):
    title: str
    code: Optional[str] = "CS-101"
    department: Optional[str] = "Computer Science"
    author: Optional[str] = "Faculty"
    description: Optional[str] = ""
    units: List[Dict[str, Any]]

class SyllabusQuizGenerateRequest(BaseModel):
    unit_id: str
    unit_title: str
    concepts: List[str]
    num_questions: Optional[int] = 5

class SyllabusQuizEvaluateRequest(BaseModel):
    student_id: Optional[str] = "student_001"
    quiz_questions: List[Dict[str, Any]]
    student_answers: Dict[str, Any]