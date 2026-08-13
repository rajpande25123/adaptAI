"""
api/schemas.py
==============
EduAdapt AI — Pydantic Request/Response Models

HOW IT WORKS:
- Pydantic models define the "shape" of data expected in API requests.
- FastAPI validates incoming JSON automatically against these models.
- If a required field is missing, FastAPI returns a 422 error with details.
"""

from pydantic import BaseModel, EmailStr
from typing import Dict, List, Any, Optional


# ─────────────────────────────────────────────────────────────────────────────
# EXISTING SCHEMAS (kept from original)
# ─────────────────────────────────────────────────────────────────────────────

class LearningRequest(BaseModel):
    student_id: str
    learning_style: str = "visual"
    difficulty_level: str = "intermediate"
    subject_area: str = "mathematics"

class LearningResponse(BaseModel):
    student_id: str
    recommendations: List[Dict[str, Any]]
    learning_path: Dict[str, Any]

class MultimodalDiagnosisRequest(BaseModel):
    student_id: str
    performance_data: Dict[str, Any] = {}
    behavior_data: Dict[str, Any] = {}
    student_question: Optional[str] = ""
    assessment_errors: Optional[List[str]] = []

class AdaptiveQuizGenerateRequest(BaseModel):
    student_id: str
    target_concepts: List[str] = ["algebra", "derivatives"]
    num_questions: int = 5

class AdaptiveQuizSubmitRequest(BaseModel):
    student_id: str
    quiz_questions: List[Dict[str, Any]]
    student_answers: Dict[str, int]

class InternshipPostRequest(BaseModel):
    title: str
    company: str
    location: str = "Remote"
    stipend: str = "Negotiable"
    deadline: str = ""
    target_year: str = "All Years"
    target_div: str = "All Divisions"
    description: str = ""
    apply_url: str = "#"
    posted_by: str = ""

class SyllabusCreateRequest(BaseModel):
    title: str
    department: str = "Computer Science"
    author: str = "Faculty"
    code: str = "CS-101"
    description: str = ""
    units: List[Dict[str, Any]] = []

class SyllabusQuizGenerateRequest(BaseModel):
    unit_id: str
    unit_title: str
    concepts: List[str] = []
    num_questions: int = 5

class SyllabusQuizEvaluateRequest(BaseModel):
    quiz_questions: List[Dict[str, Any]]
    student_answers: Dict[str, int]


# ─────────────────────────────────────────────────────────────────────────────
# NEW SCHEMAS — User Management
# ─────────────────────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    role: str                                   # 'student' | 'teacher' | 'hod'
    name: str
    email: str
    password: str
    phone: str = ""
    department: str = ""
    employeeId: str = ""
    # Student fields
    prn: str = ""
    year: str = ""
    division: str = ""
    address: str = ""
    parentName: str = ""
    parentPhone: str = ""
    parentEmail: str = ""
    linkedin: str = ""
    github: str = ""
    leetcode: str = ""
    hackerrank: str = ""
    # Teacher fields
    subjects: List[str] = []

class UserLoginRequest(BaseModel):
    email: str
    password: str
    role: str                                   # 'student' | 'teacher' | 'hod'

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    leetcode: Optional[str] = None
    hackerrank: Optional[str] = None
    subjects: Optional[List[str]] = None
    password: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# NEW SCHEMAS — Student Records
# ─────────────────────────────────────────────────────────────────────────────

class StudentRecordUpdateRequest(BaseModel):
    cgpa: Optional[Dict[str, str]] = None
    attendance: Optional[str] = None
    behavior: Optional[str] = None

class AssignmentAddRequest(BaseModel):
    title: str
    submitted: bool = False
    onTime: bool = True
    marks: int = 0
    maxMarks: int = 20

class ClassTestAddRequest(BaseModel):
    title: str
    marks: int = 0
    maxMarks: int = 25
    date: str = ""

class RemarkAddRequest(BaseModel):
    teacherName: str
    text: str
    date: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# NEW SCHEMAS — Quizzes
# ─────────────────────────────────────────────────────────────────────────────

class QuizCreateRequest(BaseModel):
    title: str
    subject: str = ""
    targetYear: str = "All"
    targetDivision: str = "All"
    department: str = ""
    teacherId: str = ""
    teacherName: str = ""
    dueDate: str = ""
    proctored: bool = True
    maxViolations: int = 3
    questions: List[Dict[str, Any]] = []

class QuizSubmitRequest(BaseModel):
    quizId: str
    studentId: str
    score: int
    total: int
    timeTakenSeconds: int = 0
    answers: Dict[str, int] = {}


# ─────────────────────────────────────────────────────────────────────────────
# NEW SCHEMAS — Goals & Q&A
# ─────────────────────────────────────────────────────────────────────────────

class GoalUpdateRequest(BaseModel):
    targetCgpa: str = "9.0"
    targetAccuracy: str = "85"
    weeklyHours: str = "12"
    targetMastery: str = "90"

class QAAddRequest(BaseModel):
    studentId: str
    studentName: str = ""
    topic: str = ""
    question: str

class QAAnswerRequest(BaseModel):
    teacherName: str
    answer: str