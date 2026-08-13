import os
import sys
import json
import time
import pandas as pd
import streamlit as st

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from data.internship_store import internship_store
from data.syllabus_store import syllabus_store
from assessment.ai_syllabus_engine import AISyllabusEngine

# ── STREAMLIT PAGE CONFIG ────────────────────────────────
st.set_page_config(
    page_title="EduAdapt AI — Multimodal Learning Platform",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: 800;
        background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        color: #4b5563;
        font-size: 1.1rem;
        margin-bottom: 2rem;
    }
    .card-box {
        padding: 1.5rem;
        border-radius: 12px;
        background-color: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        margin-bottom: 1.2rem;
    }
    .metric-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.85rem;
    }
</style>
""", unsafe_allow_html=True)

# ── SIDEBAR DOCK NAVIGATION ──────────────────────────────
st.sidebar.image("https://img.icons8.com/duotone/96/4f46e5/education.png", width=60)
st.sidebar.title("EduAdapt AI")
st.sidebar.markdown("**Multimodal Student Learning Platform**")

role = st.sidebar.radio(
    "🔑 Select Dashboard Portal:",
    ["🎓 Student Portal", "📚 Syllabus & AI Quiz Generator", "👨‍🏫 Teacher Portal", "🏛️ HOD Portal", "💼 Live Internship Opportunities", "🔍 AI Gap Analyzer"]
)

st.sidebar.markdown("---")
st.sidebar.info("💡 **Local Network Sync Active:** All internship postings are synchronized in real-time across HOD, Teacher, and Student logins.")

# ── 1. STUDENT PORTAL ────────────────────────────────────
if role == "🎓 Student Portal":
    st.markdown('<div class="main-header">🎓 Student Academic Dashboard</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Welcome back, <strong>Alex Rivera</strong> (TY Computer Science)</div>', unsafe_allow_html=True)

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Latest CGPA", "9.1", "+0.2 Sem-on-Sem")
    with col2:
        st.metric("AI Mastery Index", "88%", "+5% Growth")
    with col3:
        st.metric("Attendance", "88%", "Good Standing")
    with col4:
        st.metric("Assignments Done", "92%", "11/12 Completed")

    st.markdown("### 📈 Concept Mastery Breakdown")
    concept_data = pd.DataFrame({
        "Concept": ["Algebra & Equations", "Linear System Solver", "Derivatives", "Partial Derivatives", "Optimization & Gradient Descent"],
        "Mastery Score (%)": [85, 70, 40, 25, 20]
    })
    st.bar_chart(concept_data.set_index("Concept"))

    st.markdown("### 🎓 Recommended Internship Opportunities")
    internships = internship_store.get_all()
    if internships:
        for item in internships[:2]:
            with st.expander(f"💼 {item['title']} — {item['company']} ({item['stipend']})", expanded=True):
                st.write(f"**Location:** {item.get('location', 'Remote')} | **Deadline:** {item.get('deadline', 'Open')}")
                st.write(item.get('description', ''))
                st.write(f"*Posted by: {item.get('posted_by', 'Faculty')}*")
                st.link_button("🚀 Apply Now", item.get('apply_url', '#'))
    else:
        st.info("No active internships currently posted.")

# ── 1.5 SYLLABUS & AI QUIZ GENERATOR ─────────────────────
elif role == "📚 Syllabus & AI Quiz Generator":
    st.markdown('<div class="main-header">📚 Syllabus Curriculum & AI Diagnostic Engine</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Select a syllabus unit to auto-generate diagnostic quizzes, detailed topic explanations, and targeted remedial practice quizzes.</div>', unsafe_allow_html=True)

    syllabi = syllabus_store.get_all()
    if syllabi:
        syl = syllabi[0]
        st.subheader(f"📖 {syl['title']} ({syl.get('code', 'CS-101')})")
        st.caption(f"Department: {syl.get('department')} | Author: {syl.get('author')}")
        st.write(syl.get('description', ''))

        col1, col2 = st.columns([1, 1])
        with col1:
            st.markdown("### 📜 Units in Syllabus:")
            selected_unit_idx = st.radio(
                "Choose a unit:",
                range(len(syl['units'])),
                format_func=lambda i: syl['units'][i]['title']
            )
            unit = syl['units'][selected_unit_idx]
            st.info(f"**Unit Overview:** {unit.get('description')}")
            st.write("**Target Learning Goals:**")
            for goal in unit.get('learning_goals', []):
                st.write(f"- {goal}")

        with col2:
            st.markdown("### 🧠 AI Unit Quiz & Remedial Loop")
            c_btn1, c_btn2 = st.columns(2)
            with c_btn1:
                if st.button("⚡ Generate AI Unit Quiz", key=f"gen_{unit['unit_id']}"):
                    quiz_q = AISyllabusEngine.generate_unit_quiz(unit, num_questions=5)
                    st.session_state['active_syl_quiz'] = quiz_q
                    st.session_state['active_syl_unit_title'] = unit['title']
            with c_btn2:
                if st.button("🎯 Random 5 MCQs (From 100-Bank)", key="gen_rnd_100"):
                    quiz_q = AISyllabusEngine.get_random_mcq_quiz(num_questions=5)
                    st.session_state['active_syl_quiz'] = quiz_q
                    st.session_state['active_syl_unit_title'] = "Random 5 MCQs (100-Question Syllabus Bank)"

            if 'active_syl_quiz' in st.session_state and st.session_state['active_syl_quiz']:
                st.markdown(f"#### Quiz: {st.session_state.get('active_syl_unit_title', 'Unit')}")
                user_answers = {}
                with st.form("syl_quiz_form"):
                    for idx, q in enumerate(st.session_state['active_syl_quiz']):
                        user_answers[idx] = st.radio(f"**Q{idx+1}. {q['q']}**", range(len(q['opts'])), format_func=lambda i, opts=q['opts']: opts[i], key=f"sq_{idx}")
                    
                    sub = st.form_submit_button("🧠 Evaluate & Generate Remedial Lesson")
                    if sub:
                        res = AISyllabusEngine.evaluate_quiz_and_generate_remedial(st.session_state['active_syl_quiz'], user_answers)
                        st.session_state['syl_quiz_result'] = res

            if 'syl_quiz_result' in st.session_state:
                res = st.session_state['syl_quiz_result']
                st.markdown("---")
                st.metric("Quiz Score", f"{res['score_pct']}%", f"{res['correct_count']}/{res['total_questions']} Correct")
                
                if res['needs_improvement'] and res['remedial_lessons']:
                    st.warning("### 💡 AI Topic Explanation & Learning Breakdown")
                    for lesson in res['remedial_lessons']:
                        st.error(f"**{lesson['title']}**")
                        st.write(lesson['explanation'])
                        st.code(f"Formula: {lesson['formula']}", language="python")
                    
                    st.success("🎯 Follow-Up Targeted Practice Quiz generated for student improvement!")
                else:
                    st.success("🎉 Excellent mastery of this syllabus unit!")

# ── 2. TEACHER PORTAL ────────────────────────────────────
elif role == "👨‍🏫 Teacher Portal":
    st.markdown('<div class="main-header">👨‍🏫 Teacher Management Portal</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Logged in as: <strong>Prof. AIML Teacher</strong></div>', unsafe_allow_html=True)

    tab1, tab2 = st.tabs(["👥 Student Roster & Performance", "📢 Post Internship Opportunity"])

    with tab1:
        st.markdown("### Student Class Roster")
        students_df = pd.DataFrame([
            {"Name": "Alex Rivera", "PRN": "PRN2021001", "Year": "TY-A", "CGPA": 9.1, "Attendance": "88%", "Status": "Active"},
            {"Name": "Priya Sharma", "PRN": "PRN2021002", "Year": "TY-A", "CGPA": 9.5, "Attendance": "96%", "Status": "Top Ranker"},
            {"Name": "Rahul Desai", "PRN": "PRN2021003", "Year": "SY-B", "CGPA": 6.4, "Attendance": "71%", "Status": "⚠️ Needs Review"}
        ])
        st.dataframe(students_df, use_container_width=True)

    with tab2:
        st.markdown("### Broadcast Internship Opportunity")
        with st.form("teacher_internship_form"):
            t_title = st.text_input("Internship Title *", placeholder="e.g. AI Research Intern")
            t_company = st.text_input("Company Name *", placeholder="e.g. EduAdapt Research")
            t_location = st.text_input("Location", value="Remote / Pune")
            t_stipend = st.text_input("Stipend", value="₹20,000 / month")
            t_url = st.text_input("Application URL / Contact Email *", placeholder="https://careers.example.com")
            t_desc = st.text_area("Role Description *", placeholder="Describe prerequisites and responsibilities...")
            
            submitted = st.form_submit_button("🚀 Broadcast Internship")
            if submitted:
                if t_title and t_company and t_url and t_desc:
                    internship_store.create({
                        "title": t_title,
                        "company": t_company,
                        "location": t_location,
                        "stipend": t_stipend,
                        "apply_url": t_url,
                        "description": t_desc,
                        "posted_by": "Prof. AIML Teacher (Faculty)"
                    })
                    st.success("✅ Internship posted successfully and synced across network!")
                else:
                    st.error("Please fill in all required fields.")

# ── 3. HOD PORTAL ────────────────────────────────────────
elif role == "🏛️ HOD Portal":
    st.markdown('<div class="main-header">🏛️ Department Head (HOD) Portal</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Department of AI & Machine Learning</div>', unsafe_allow_html=True)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Students Enrolled", "148", "6 Divisions")
    with col2:
        st.metric("Active Faculty Members", "12", "All Positions Filled")
    with col3:
        st.metric("Average Dept CGPA", "8.2", "+0.4 Year-over-Year")

    st.markdown("### 🏛️ Broadcast HOD Internship / Research Fellowship")
    with st.form("hod_internship_form"):
        h_title = st.text_input("Internship Title *", placeholder="e.g. Google DeepMind AI Scholar")
        h_company = st.text_input("Company / Institution *", placeholder="e.g. Google DeepMind")
        h_location = st.text_input("Location", value="Bangalore / Remote")
        h_stipend = st.text_input("Stipend", value="₹35,000 / month")
        h_url = st.text_input("Application URL *", placeholder="https://careers.google.com")
        h_desc = st.text_area("Description & Prerequisites *")
        
        hod_submitted = st.form_submit_button("🏛️ Publish Department Internship")
        if hod_submitted:
            if h_title and h_company and h_url and h_desc:
                internship_store.create({
                    "title": h_title,
                    "company": h_company,
                    "location": h_location,
                    "stipend": h_stipend,
                    "apply_url": h_url,
                    "description": h_desc,
                    "posted_by": "Dr. Rajesh Sharma (HOD)"
                })
                st.success("🎉 HOD Internship broadcasted to all students!")
            else:
                st.error("Please fill in required fields.")

# ── 4. LIVE INTERNSHIP OPPORTUNITIES ─────────────────────
elif role == "💼 Live Internship Opportunities":
    st.markdown('<div class="main-header">💼 Live Internship Opportunities Board</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Real-time synchronized opportunities from HOD & Faculty</div>', unsafe_allow_html=True)

    internships = internship_store.get_all()
    if not internships:
        st.warning("No internships posted yet. HOD or Teachers can post from their portal.")
    else:
        for idx, item in enumerate(internships):
            st.subheader(f"💼 {item['title']}")
            st.caption(f"🏢 **{item['company']}** | 📍 {item.get('location')} | 💰 {item.get('stipend')} | 📅 Deadline: {item.get('deadline', 'Open')}")
            st.write(item.get('description', ''))
            
            c1, c2 = st.columns([1, 4])
            with c1:
                st.link_button("🚀 Apply Now", item.get('apply_url', '#'))
            with c2:
                if st.button(f"🗑️ Delete Posting", key=f"del_{item['id']}"):
                    internship_store.delete(item['id'])
                    st.rerun()
            st.divider()

# ── 5. AI GAP ANALYZER ───────────────────────────────────
elif role == "🔍 AI Gap Analyzer":
    st.markdown('<div class="main-header">🔍 Multimodal Diagnostic Gap Analyzer</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Simulate student concept performance & inspect AI diagnosis</div>', unsafe_allow_html=True)

    st.markdown("#### Adjust Concept Mastery Sliders:")
    alg = st.slider("Algebra & Equations", 0, 100, 85)
    lin = st.slider("Linear System Solver", 0, 100, 70)
    der = st.slider("Derivatives", 0, 100, 40)
    pder = st.slider("Partial Derivatives", 0, 100, 25)
    opt = st.slider("Optimization & Gradient Descent", 0, 100, 20)

    if st.button("🧠 Run Multimodal AI Diagnosis"):
        st.markdown("---")
        st.markdown("### 📊 AI Diagnosis Result")
        
        gaps = []
        if pder < 50:
            gaps.append("⚠️ **Partial Derivatives:** Foundational prerequisite gap detected before Optimization.")
        if opt < 50:
            gaps.append("⚠️ **Optimization & Gradient Descent:** Conceptual gap in applying partial derivatives to cost function minimization.")

        if gaps:
            st.error("#### Identified Root Learning Gaps:")
            for g in gaps:
                st.write(g)
            
            st.info("#### Recommended Learning Interventions:")
            st.write("1. 📹 **Interactive Visual Module:** Watch 3D Gradient Surface Visualization.")
            st.write("2. 📝 **Targeted Quiz:** Complete 5 adaptive questions on Partial Derivative chain rules.")
        else:
            st.success("🎉 Excellent! All concept mastery levels are strong!")
