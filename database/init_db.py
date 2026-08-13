"""
database/init_db.py
===================
EduAdapt AI — Database Initializer & Demo Seed Data

HOW IT WORKS:
- Run this script ONCE to create all database tables and load demo data.
- It is safe to run multiple times — it checks if data exists first.
- Called automatically when the FastAPI server starts (in run_app.py).

DEMO USERS SEEDED:
  HOD:     hod@edu.ai / hod123
  Teacher: teacher@edu.ai / teacher123
  Student: demo@edu.ai / demo123
"""

from database.db import engine, SessionLocal
from database.models import Base
from database import crud


def create_tables():
    """Create all database tables based on the SQLAlchemy models."""
    print("[EduAdapt DB] Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("[EduAdapt DB] OK Tables created.")


def seed_demo_data(db):
    """Seed the database with demo users and data (only if empty)."""

    # ── Check if already seeded ───────────────────────────────────────────
    existing = crud.get_user_by_email(db, "hod@edu.ai")
    if existing:
        print("[EduAdapt DB] Seed data already exists — skipping.")
        return

    print("[EduAdapt DB] Seeding demo data...")

    # ── HOD Users ─────────────────────────────────────────────────────────
    hod1 = crud.create_user(db, {
        "id": "hod_1", "role": "hod", "name": "Dr. Ramesh Patil",
        "email": "hod@edu.ai", "password": "hod123",
        "employeeId": "HOD-CS-01", "department": "Computer Science",
        "phone": "+91 98765 43211"
    })

    hod_aiml = crud.create_user(db, {
        "id": "hod_aiml", "role": "hod", "name": "Prof. AIML HOD",
        "email": "aimlhod", "password": "Pass",
        "employeeId": "HOD-AIML-01", "department": "AI & Machine Learning",
        "phone": "+91 98765 00001"
    })

    # ── Teacher Users ─────────────────────────────────────────────────────
    crud.create_user(db, {
        "id": "t_1", "role": "teacher", "name": "Prof. Anjali Sharma",
        "email": "teacher@edu.ai", "password": "teacher123",
        "employeeId": "EMP-CS-101", "department": "Computer Science",
        "phone": "+91 98765 43210",
        "subjects": ["Machine Learning", "Data Structures & Algorithms", "Deep Learning"]
    })
    crud.create_user(db, {
        "id": "t_2", "role": "teacher", "name": "Prof. Rohan Mehta",
        "email": "teacher2@edu.ai", "password": "teacher123",
        "employeeId": "EMP-CS-102", "department": "Computer Science",
        "phone": "+91 98765 43220",
        "subjects": ["Web Development", "Cloud Computing"]
    })
    crud.create_user(db, {
        "id": "t_3", "role": "teacher", "name": "Dr. Vikramaditya Joshi",
        "email": "teacher3@edu.ai", "password": "teacher123",
        "employeeId": "EMP-CS-103", "department": "Computer Science",
        "phone": "+91 98765 43230",
        "subjects": ["Cyber Security", "Database Management Systems"]
    })
    crud.create_user(db, {
        "id": "t_aiml", "role": "teacher", "name": "Prof. AIML Teacher",
        "email": "aimlteach", "password": "Pass",
        "employeeId": "EMP-AIML-101", "department": "AI & Machine Learning",
        "phone": "+91 98765 00002",
        "subjects": ["Machine Learning", "Deep Learning", "NLP", "Artificial Intelligence"]
    })

    # ── Student Users ─────────────────────────────────────────────────────
    crud.create_user(db, {
        "id": "stu_demo", "role": "student", "name": "Alex Rivera",
        "email": "demo@edu.ai", "password": "demo123",
        "prn": "PRN2021001", "year": "TY", "division": "A",
        "department": "Computer Science", "phone": "+91 98765 43212",
        "address": "12, FC Road, Shivaji Nagar, Pune 411016",
        "parentName": "Carlos Rivera", "parentPhone": "+91 98765 43213",
        "parentEmail": "carlos@example.com",
        "linkedin": "linkedin.com/in/alexrivera", "github": "github.com/alexrivera",
        "leetcode": "leetcode.com/alexrivera", "hackerrank": "hackerrank.com/alexrivera"
    })
    crud.create_user(db, {
        "id": "stu_2", "role": "student", "name": "Priya Sharma",
        "email": "priya@edu.ai", "password": "priya123",
        "prn": "PRN2021002", "year": "TY", "division": "A",
        "department": "Computer Science", "phone": "+91 91234 56789",
        "address": "45, Kothrud, Pune 411038",
        "parentName": "Suresh Sharma", "parentPhone": "+91 91234 56780",
        "parentEmail": "suresh@example.com",
        "linkedin": "linkedin.com/in/priyasharma", "github": "github.com/priyasharma"
    })
    crud.create_user(db, {
        "id": "stu_3", "role": "student", "name": "Rahul Desai",
        "email": "rahul@edu.ai", "password": "rahul123",
        "prn": "PRN2021003", "year": "SY", "division": "B",
        "department": "Computer Science", "phone": "+91 92345 67890",
        "address": "7, Aundh, Pune 411007",
        "parentName": "Vijay Desai", "parentPhone": "+91 92345 67891",
        "parentEmail": "vijay@example.com", "github": "github.com/rahuldesai"
    })

    # ── Student Academic Records ──────────────────────────────────────────
    crud.upsert_student_record(db, "stu_demo", {
        "cgpa": {"sem1":"8.4","sem2":"8.1","sem3":"8.6","sem4":"8.9","sem5":"9.1","sem6":""},
        "attendance": "88",
        "behavior": "Active participant in discussions. Good grasp of concepts, high potential."
    })
    crud.add_assignment(db, "stu_demo", {"title": "ML Lab 1 — Linear & Logistic Regression",
                                          "submitted": True, "onTime": True, "marks": 19, "maxMarks": 20})
    crud.add_assignment(db, "stu_demo", {"title": "DSA Assignment — Binary Search Trees",
                                          "submitted": True, "onTime": False, "marks": 16, "maxMarks": 20})
    crud.add_assignment(db, "stu_demo", {"title": "Cloud Computing Deployment Mini-Project",
                                          "submitted": True, "onTime": True, "marks": 28, "maxMarks": 30})
    crud.add_class_test(db, "stu_demo", {"title": "Unit Test 1 — Machine Learning",
                                          "marks": 23, "maxMarks": 25, "date": "2024-02-10"})
    crud.add_class_test(db, "stu_demo", {"title": "Unit Test 2 — Cloud Architecture",
                                          "marks": 21, "maxMarks": 25, "date": "2024-03-15"})
    crud.add_remark(db, "stu_demo", {"teacherName": "Prof. Anjali Sharma",
                                      "text": "Excellent logic in ML. Practice more gradient calculations.",
                                      "date": "2024-03-20"})

    crud.upsert_student_record(db, "stu_2", {
        "cgpa": {"sem1":"9.2","sem2":"9.0","sem3":"9.4","sem4":"9.3","sem5":"9.5","sem6":""},
        "attendance": "96",
        "behavior": "Top performer. Always submits ahead of deadline."
    })
    crud.add_assignment(db, "stu_2", {"title": "ML Lab 1", "submitted": True, "onTime": True,
                                       "marks": 20, "maxMarks": 20})
    crud.add_class_test(db, "stu_2", {"title": "Unit Test 1 — Machine Learning",
                                       "marks": 25, "maxMarks": 25, "date": "2024-02-10"})

    # ── Demo Quizzes ──────────────────────────────────────────────────────
    crud.create_quiz(db, {
        "id": "q_demo_1",
        "title": "Machine Learning & Optimization Quiz",
        "subject": "Machine Learning",
        "targetYear": "TY", "targetDivision": "A", "department": "Computer Science",
        "teacherId": "t_aiml", "teacherName": "Prof. AIML Teacher",
        "dueDate": "2026-08-20", "proctored": True, "maxViolations": 3,
        "questions": [
            {"q": "In gradient descent, what happens if alpha is too large?",
             "opts": ["Overshooting the minimum", "Faster exact convergence", "Zero gradient", "Vanishing weights"],
             "ans": 0, "concept": "optimization"},
            {"q": "What is the derivative of f(x) = 3x² + 5x?",
             "opts": ["6x + 5", "3x + 5", "6x²", "5x"], "ans": 0, "concept": "derivatives"},
            {"q": "Which loss function is used for binary classification?",
             "opts": ["Binary Cross-Entropy", "Mean Squared Error", "Hinge Loss", "Categorical CE"],
             "ans": 0, "concept": "loss_functions"}
        ]
    })

    # ── Demo Submission ───────────────────────────────────────────────────
    crud.submit_quiz(db, {
        "quizId": "q_demo_1", "studentId": "stu_demo",
        "score": 3, "total": 3, "timeTakenSeconds": 145,
        "answers": {"0": 0, "1": 0, "2": 0}
    })

    # ── Student Goals ─────────────────────────────────────────────────────
    crud.upsert_goals(db, "stu_demo", {
        "targetCgpa": "9.0", "targetAccuracy": "85",
        "weeklyHours": "12", "targetMastery": "90"
    })

    # ── Q&A ───────────────────────────────────────────────────────────────
    q1 = crud.add_question(db, {
        "studentId": "stu_demo", "studentName": "Alex Rivera",
        "topic": "Gradient Descent & Partial Derivatives",
        "question": "Why does gradient descent overshoot when alpha is set too high?"
    })
    crud.answer_question(db, q1.id, "Prof. AIML Teacher",
        "When alpha is too large, the update step steps past the minimum into regions "
        "of higher gradient, causing divergence instead of convergence.")

    crud.add_question(db, {
        "studentId": "stu_2", "studentName": "Priya Sharma",
        "topic": "Loss Functions",
        "question": "When should we use Binary Cross-Entropy over MSE in classification?"
    })

    # ── Internships ───────────────────────────────────────────────────────
    crud.create_internship(db, {
        "title": "AI & Multimodal Machine Learning Intern", "company": "EduAdapt AI Research Labs",
        "location": "Remote / Hybrid", "stipend": "₹25,000 / month",
        "deadline": "2026-09-30", "target_year": "All Years", "target_div": "All Divisions",
        "description": "Work alongside senior AI engineers to develop knowledge tracing models.",
        "apply_url": "https://careers.eduadapt.ai/internship/ai-ml",
        "posted_by": "Dr. Rajesh Sharma (HOD)"
    })
    crud.create_internship(db, {
        "title": "Full-Stack Web Development Intern", "company": "TechVision Systems",
        "location": "Pune / Remote", "stipend": "₹20,000 / month",
        "deadline": "2026-09-15", "target_year": "SY / TY", "target_div": "All Divisions",
        "description": "Build scalable web interfaces, RESTful APIs, and dashboards.",
        "apply_url": "https://techvision.io/careers/fullstack",
        "posted_by": "Prof. Sangeeta Verma (Faculty)"
    })

    # ── Syllabus ──────────────────────────────────────────────────────────
    crud.create_syllabus(db, {
        "title": "Machine Learning & Artificial Intelligence (AI-2026)",
        "department": "Computer Science & AIML",
        "author": "Dr. Rajesh Sharma (HOD)",
        "code": "CS-AI-501",
        "description": "Comprehensive curriculum covering linear algebra, calculus, optimization, deep networks.",
        "units": [
            {"unit_id": "u1", "unit_number": 1, "title": "Unit 1: Linear Algebra & Matrix Operations",
             "description": "Foundations of linear equations, matrix multiplication, eigenvalues.",
             "concepts": ["algebra", "linear_equations", "matrix_operations"],
             "learning_goals": ["Solve linear equations", "Calculate matrix products", "Vector spaces"]},
            {"unit_id": "u2", "unit_number": 2, "title": "Unit 2: Calculus, Derivatives & Optimization",
             "description": "Differential calculus, partial derivatives, gradient descent.",
             "concepts": ["derivatives", "partial_derivatives", "optimization"],
             "learning_goals": ["Compute partial derivatives", "Learning rate convergence", "Local minima"]},
            {"unit_id": "u3", "unit_number": 3, "title": "Unit 3: Deep Neural Networks & Loss Functions",
             "description": "MLP, activation functions, cross-entropy, backpropagation.",
             "concepts": ["neural_networks", "loss_functions", "backpropagation"],
             "learning_goals": ["Derive backprop chain rule", "Binary Cross-Entropy", "ReLU & Sigmoid"]},
            {"unit_id": "u4", "unit_number": 4, "title": "Unit 4: Computer Vision & Transformers",
             "description": "CNNs, self-attention, transformer encoders.",
             "concepts": ["computer_vision", "nlp", "transformers"],
             "learning_goals": ["CNN feature maps", "Self-attention mechanism", "Pre-trained models"]}
        ]
    })

    print("[EduAdapt DB] Demo data seeded successfully!")
    print("[EduAdapt DB]   HOD:     hod@edu.ai / hod123")
    print("[EduAdapt DB]   Teacher: teacher@edu.ai / teacher123")
    print("[EduAdapt DB]   Student: demo@edu.ai / demo123")


def init_db():
    """Full initialization: create tables + seed data."""
    create_tables()
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
