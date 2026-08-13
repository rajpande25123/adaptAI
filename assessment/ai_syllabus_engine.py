import random
import time
from typing import Dict, List, Any

# Knowledge Base of Explanations & Questions mapped to Concepts
CONCEPT_REMEDIAL_KNOWLEDGE = {
    "algebra": {
        "title": "Algebraic Foundations & Linear Equations",
        "explanation": "Linear equations express relationships where variables increase at a constant rate. To isolate a variable x, apply inverse operations symmetrically to both sides of the equals sign (e.g., subtracting constants then dividing coefficients).",
        "formula": "y = mx + c  ==>  x = (y - c) / m",
        "questions": [
            {
                "q": "Solve for x in the linear equation: 4x - 8 = 16",
                "opts": ["x = 6", "x = 4", "x = 8", "x = 2"],
                "ans": 0,
                "explanation": "Add 8 to both sides: 4x = 24. Then divide by 4: x = 6.",
                "concept": "algebra"
            },
            {
                "q": "Which of the following describes the slope m in y = 3x - 5?",
                "opts": ["3", "-5", "5", "1/3"],
                "ans": 0,
                "explanation": "In slope-intercept form y = mx + c, the coefficient of x is the slope m = 3.",
                "concept": "algebra"
            }
        ]
    },
    "linear_equations": {
        "title": "Systems of Linear Equations & Matrices",
        "explanation": "A system of linear equations represents intersecting hyperplanes. Matrix multiplication A * x = b allows solving complex systems via Matrix Inversion or Gaussian Elimination.",
        "formula": "A * x = b  ==>  x = A^(-1) * b",
        "questions": [
            {
                "q": "If matrix A is 2x3 and matrix B is 3x2, what are the dimensions of the product AB?",
                "opts": ["2x2", "3x3", "2x3", "Undefined"],
                "ans": 0,
                "explanation": "When multiplying (m x n) by (n x p), the resulting matrix has dimensions (m x p) = (2 x 2).",
                "concept": "linear_equations"
            }
        ]
    },
    "derivatives": {
        "title": "Differential Calculus & Derivatives",
        "explanation": "The derivative f'(x) measures the instantaneous rate of change or instantaneous slope of a function. Using the power rule d/dx[x^n] = n*x^(n-1).",
        "formula": "d/dx [a*x^n + b] = a*n*x^(n-1)",
        "questions": [
            {
                "q": "What is the derivative of f(x) = 5x^3 - 4x^2 + 7?",
                "opts": ["15x^2 - 8x", "15x^3 - 8x", "5x^2 - 4x", "15x^2 - 8"],
                "ans": 0,
                "explanation": "Apply the power rule: d/dx[5x^3] = 15x^2, d/dx[-4x^2] = -8x, d/dx[7] = 0. Result = 15x^2 - 8x.",
                "concept": "derivatives"
            },
            {
                "q": "What is the derivative of sin(x) with respect to x?",
                "opts": ["cos(x)", "-cos(x)", "-sin(x)", "tan(x)"],
                "ans": 0,
                "explanation": "The standard calculus derivative of sin(x) is cos(x).",
                "concept": "derivatives"
            }
        ]
    },
    "partial_derivatives": {
        "title": "Multivariate Partial Derivatives",
        "explanation": "Partial derivatives ∂f/∂x evaluate the slope of a multivariable function f(x, y) along a single coordinate axis while treating all other variables as constant values.",
        "formula": "∂/∂x [x^n * y^m] = n * x^(n-1) * y^m",
        "questions": [
            {
                "q": "Find the partial derivative with respect to y of f(x, y) = 3x^2*y + 4y^2.",
                "opts": ["3x^2 + 8y", "6xy + 8y", "3x^2", "6xy"],
                "ans": 0,
                "explanation": "Treat x as constant. ∂/∂y[3x^2*y] = 3x^2 and ∂/∂y[4y^2] = 8y. Total = 3x^2 + 8y.",
                "concept": "partial_derivatives"
            },
            {
                "q": "What does the gradient vector ∇f(x, y) point toward?",
                "opts": ["Direction of steepest ascent", "Direction of zero slope", "Direction of steepest descent", "Parallel to contour lines"],
                "ans": 0,
                "explanation": "The gradient vector ∇f points directly in the direction of maximum rate of increase (steepest ascent).",
                "concept": "partial_derivatives"
            }
        ]
    },
    "optimization": {
        "title": "Gradient Descent & Loss Minimization",
        "explanation": "Gradient descent updates model parameters theta in the opposite direction of the gradient: theta = theta - alpha * ∇J(theta). Setting alpha too large causes overshooting and divergence, while too small alpha leads to slow training.",
        "formula": "θ := θ - α * ∇_θ J(θ)",
        "questions": [
            {
                "q": "In gradient descent, what occurs if the learning rate alpha is set excessively high?",
                "opts": ["Overshooting the cost minimum and divergence", "Immediate exact convergence", "Zero gradient calculation", "Weights freeze"],
                "ans": 0,
                "explanation": "A very large alpha takes steps past the local minimum, oscillating outward and causing loss divergence.",
                "concept": "optimization"
            },
            {
                "q": "At a local minimum of a smooth loss function J(x), what is the value of the gradient ∇J(x)?",
                "opts": ["Zero (0)", "One (1)", "Infinity", "Negative infinity"],
                "ans": 0,
                "explanation": "At local minima, maxima, and stationary points, the derivative/gradient vector equals zero.",
                "concept": "optimization"
            }
        ]
    },
    "neural_networks": {
        "title": "Neural Networks & Activation Functions",
        "explanation": "Neural networks chain linear matrix transformations with non-linear activation functions (ReLU, Sigmoid, Softmax) to approximate complex non-linear decision boundaries.",
        "formula": "z = W*x + b,  a = σ(z)",
        "questions": [
            {
                "q": "Why are non-linear activation functions (e.g. ReLU) essential in deep neural networks?",
                "opts": ["To allow the network to learn non-linear decision boundaries", "To keep weights below 1.0", "To eliminate the need for bias terms", "To speed up matrix multiplication"],
                "ans": 0,
                "explanation": "Without non-linear activations, stacking multiple layers collapses mathematically into a single linear transformation.",
                "concept": "neural_networks"
            }
        ]
    },
    "loss_functions": {
        "title": "Loss Functions & Binary Cross-Entropy",
        "explanation": "Loss functions quantify prediction errors. Binary Cross-Entropy (BCE) heavily penalizes confident wrong probability predictions in classification tasks.",
        "formula": "Loss = - [ y * log(p) + (1 - y) * log(1 - p) ]",
        "questions": [
            {
                "q": "Which loss function is optimal for binary classification probability outputs?",
                "opts": ["Binary Cross-Entropy Loss", "Mean Squared Error (MSE)", "Absolute Error (L1)", "Hinge Loss"],
                "ans": 0,
                "explanation": "Binary Cross-Entropy measures logarithmic divergence between true binary labels and predicted probabilities.",
                "concept": "loss_functions"
            }
        ]
    },
    "computer_vision": {
        "title": "Convolutional Neural Networks & Feature Extraction",
        "explanation": "Convolutional layers pass learnable kernel filters over spatial image grids to extract hierarchical features like edges, textures, and objects.",
        "formula": "Feature_Map(i,j) = Σ (Image * Kernel)",
        "questions": [
            {
                "q": "What is the primary role of Max Pooling layers in CNNs?",
                "opts": ["Reduce spatial dimensions and downsample feature maps", "Increase number of image channels", "Perform non-linear activation", "Compute loss gradients"],
                "ans": 0,
                "explanation": "Max pooling downsamples spatial height and width while retaining the most salient feature activations.",
                "concept": "computer_vision"
            }
        ]
    }
}

class AISyllabusEngine:
    """Engine to auto-generate syllabus unit quizzes and adaptive remedial learning loops."""

    @staticmethod
    def get_random_mcq_quiz(num_questions: int = 5) -> List[Dict[str, Any]]:
        """Fetch 5 random MCQs from the syllabus MCQ dataset file."""
        import os
        import json
        file_path = os.path.join(os.path.dirname(__file__), "..", "data", "syllabus_mcq_bank.json")
        questions = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                questions = json.load(f)
        except Exception:
            pass
        
        if not questions:
            for c, data in CONCEPT_REMEDIAL_KNOWLEDGE.items():
                questions.extend(data["questions"])

        selected = random.sample(questions, min(num_questions, len(questions)))
        formatted = []
        for idx, q in enumerate(selected):
            formatted.append({
                "id": f"q_mcq_{idx+1}_{int(time.time())}",
                "q": q["q"],
                "opts": q["opts"],
                "ans": q["ans"],
                "explanation": q["explanation"],
                "concept": q.get("concept", "general")
            })
        return formatted

    @staticmethod
    def generate_unit_quiz(unit: Dict[str, Any], num_questions: int = 5) -> List[Dict[str, Any]]:
        concepts = unit.get("concepts", ["derivatives", "optimization"])
        questions = []

        # Collect candidate questions matching unit concepts
        for c in concepts:
            if c in CONCEPT_REMEDIAL_KNOWLEDGE:
                questions.extend(CONCEPT_REMEDIAL_KNOWLEDGE[c]["questions"])

        # Fallback if few questions found
        if len(questions) < num_questions:
            for c, data in CONCEPT_REMEDIAL_KNOWLEDGE.items():
                questions.extend(data["questions"])

        selected = random.sample(questions, min(num_questions, len(questions)))
        
        # Structure final quiz items
        formatted = []
        for idx, q in enumerate(selected):
            formatted.append({
                "id": f"q_syl_{idx+1}_{int(time.time())}",
                "q": q["q"],
                "opts": q["opts"],
                "ans": q["ans"],
                "explanation": q["explanation"],
                "concept": q.get("concept", "general")
            })
        return formatted

    @staticmethod
    def evaluate_quiz_and_generate_remedial(
        quiz_questions: List[Dict[str, Any]],
        student_answers: Dict[str, int]
    ) -> Dict[str, Any]:
        total = len(quiz_questions)
        correct_count = 0
        concept_gaps = set()
        detailed_breakdown = []

        for idx, q in enumerate(quiz_questions):
            ans_val = student_answers.get(str(idx), student_answers.get(idx, -1))
            is_correct = (int(ans_val) == int(q["ans"]))

            if is_correct:
                correct_count += 1
            else:
                concept_gaps.add(q.get("concept", "general"))

            detailed_breakdown.append({
                "question_index": idx + 1,
                "question": q["q"],
                "user_answer": q["opts"][ans_val] if ans_val >= 0 and ans_val < len(q["opts"]) else "Not Answered",
                "correct_answer": q["opts"][q["ans"]],
                "is_correct": is_correct,
                "concept": q.get("concept", "general"),
                "explanation": q["explanation"]
            })

        score_pct = Math_round(correct_count / total * 100) if total > 0 else 0
        needs_improvement = score_pct < 80 or len(concept_gaps) > 0

        # Generate Detailed AI Topic Explanation & Learning Lessons
        remedial_lessons = []
        remedial_quiz_questions = []

        for c in concept_gaps:
            if c in CONCEPT_REMEDIAL_KNOWLEDGE:
                info = CONCEPT_REMEDIAL_KNOWLEDGE[c]
                remedial_lessons.append({
                    "concept": c,
                    "title": info["title"],
                    "explanation": info["explanation"],
                    "formula": info["formula"]
                })
                # Add questions for the follow-up improvement quiz
                for rq in info["questions"]:
                    remedial_quiz_questions.append({
                        "q": rq["q"],
                        "opts": rq["opts"],
                        "ans": rq["ans"],
                        "explanation": rq["explanation"],
                        "concept": c
                    })

        # If no specific gaps but needs improvement, populate general guidance
        if not remedial_lessons and needs_improvement:
            info = CONCEPT_REMEDIAL_KNOWLEDGE["optimization"]
            remedial_lessons.append({
                "concept": "optimization",
                "title": info["title"],
                "explanation": info["explanation"],
                "formula": info["formula"]
            })
            remedial_quiz_questions.extend(info["questions"])

        return {
            "score_pct": score_pct,
            "correct_count": correct_count,
            "total_questions": total,
            "needs_improvement": needs_improvement,
            "concept_gaps": list(concept_gaps),
            "detailed_breakdown": detailed_breakdown,
            "remedial_lessons": remedial_lessons,
            "remedial_quiz_questions": remedial_quiz_questions[:5] # Max 5 targeted practice questions
        }

def Math_round(val):
    return int(round(val))
