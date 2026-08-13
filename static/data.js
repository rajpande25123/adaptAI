// EduAdapt AI — Shared Data Layer (API-backed, Production Database)
// ================================================================
// HOW IT WORKS:
//  - All data is now stored in a real database on the server (SQLite → PostgreSQL).
//  - The browser calls REST API endpoints (fetch) instead of localStorage.
//  - localStorage is only used for the active user session (who is logged in).
//  - This means ALL students share the same real data across all devices.
//
// API BASE URL:
//  All calls go to the same server that serves the HTML pages.
//  No CORS issues since it's same-origin.

const EA = {

  // ── Session (still localStorage — just who is logged in) ─────────────
  getSession: () => JSON.parse(localStorage.getItem('ea_session') || 'null'),
  setSession: u  => localStorage.setItem('ea_session', JSON.stringify(u)),
  logout: () => {
    localStorage.removeItem('ea_session');
    window.location.href = '/';
  },

  // ── Internal API helper ───────────────────────────────────────────────
  _api: async (method, path, body = null) => {
    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(path, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      return { ok: true, data };
    } catch (err) {
      console.error(`[EduAdapt API] ${method} ${path} failed:`, err);
      return { ok: false, error: err.message };
    }
  },

  // ══════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════

  registerUser: async (data) => {
    const res = await EA._api('POST', '/api/users/register/', data);
    if (res.ok) return { ok: true, user: res.data.user };
    return { ok: false, msg: res.error };
  },

  loginUser: async (email, password, role) => {
    const res = await EA._api('POST', '/api/users/login/', { email, password, role });
    if (res.ok) {
      EA.setSession(res.data.user);
      return res.data.user;
    }
    return null;
  },

  createTeacherByHOD: async (teacherData) => {
    const res = await EA._api('POST', '/api/users/create-teacher/', { ...teacherData, role: 'teacher' });
    if (res.ok) return { ok: true, teacher: res.data.teacher };
    return { ok: false, msg: res.error };
  },

  getUserById: async (userId) => {
    const res = await EA._api('GET', `/api/users/${userId}/`);
    return res.ok ? res.data.user : null;
  },

  updateUser: async (userId, data) => {
    const res = await EA._api('PUT', `/api/users/${userId}/`, data);
    if (res.ok) return { ok: true, user: res.data.user };
    return { ok: false, msg: res.error };
  },

  deleteUser: async (userId) => {
    const res = await EA._api('DELETE', `/api/users/${userId}/`);
    return res.ok;
  },

  getStudents: async (department = null, year = null, division = null) => {
    let url = '/api/students/?';
    if (department) url += `department=${encodeURIComponent(department)}&`;
    if (year)       url += `year=${encodeURIComponent(year)}&`;
    if (division)   url += `division=${encodeURIComponent(division)}&`;
    const res = await EA._api('GET', url);
    return res.ok ? res.data.students : [];
  },

  getTeachers: async () => {
    const res = await EA._api('GET', '/api/users/?role=teacher');
    return res.ok ? res.data.users : [];
  },

  getHODs: async () => {
    const res = await EA._api('GET', '/api/users/?role=hod');
    return res.ok ? res.data.users : [];
  },

  // ══════════════════════════════════════════════════════════════════════
  // STUDENT ACADEMIC RECORDS
  // ══════════════════════════════════════════════════════════════════════

  getRecord: async (studentId) => {
    const res = await EA._api('GET', `/api/records/${studentId}/`);
    return res.ok ? res.data.record : EA.blankRecord();
  },

  saveRecord: async (studentId, record) => {
    await EA._api('PUT', `/api/records/${studentId}/`, record);
  },

  blankRecord: () => ({
    cgpa: { sem1:'', sem2:'', sem3:'', sem4:'', sem5:'', sem6:'' },
    assignments: [], classTests: [], attendance: '85',
    behavior: 'Punctual, attentive in class.', remarks: [],
  }),

  addAssignment: async (studentId, data) => {
    return await EA._api('POST', `/api/records/${studentId}/assignments/`, data);
  },

  addClassTest: async (studentId, data) => {
    return await EA._api('POST', `/api/records/${studentId}/class-tests/`, data);
  },

  addRemark: async (studentId, data) => {
    return await EA._api('POST', `/api/records/${studentId}/remarks/`, data);
  },

  // ══════════════════════════════════════════════════════════════════════
  // QUIZZES
  // ══════════════════════════════════════════════════════════════════════

  getQuizzes: async () => {
    const res = await EA._api('GET', '/api/quizzes/');
    return res.ok ? res.data.quizzes : [];
  },

  createQuiz: async (quiz) => {
    const res = await EA._api('POST', '/api/quizzes/', quiz);
    return res.ok ? res.data.quiz : null;
  },

  deleteQuiz: async (quizId) => {
    return await EA._api('DELETE', `/api/quizzes/${quizId}/`);
  },

  getAvailableQuizzes: async (year, division, department) => {
    let url = '/api/quizzes/?';
    if (year)       url += `year=${encodeURIComponent(year)}&`;
    if (division)   url += `division=${encodeURIComponent(division)}&`;
    if (department) url += `department=${encodeURIComponent(department)}&`;
    const res = await EA._api('GET', url);
    return res.ok ? res.data.quizzes : [];
  },

  // ══════════════════════════════════════════════════════════════════════
  // QUIZ SUBMISSIONS
  // ══════════════════════════════════════════════════════════════════════

  getStudentSubmissions: async (studentId) => {
    const res = await EA._api('GET', `/api/submissions/student/${studentId}/`);
    return res.ok ? res.data.submissions : [];
  },

  getQuizSubmissions: async (quizId) => {
    const res = await EA._api('GET', `/api/submissions/quiz/${quizId}/`);
    return res.ok ? res.data.submissions : [];
  },

  hasSubmitted: async (quizId, studentId) => {
    const res = await EA._api('GET', `/api/submissions/check/${quizId}/${studentId}/`);
    return res.ok ? res.data.submitted : false;
  },

  submitQuiz: async (sub) => {
    const res = await EA._api('POST', '/api/submissions/', sub);
    return res.ok ? res.data.submission : null;
  },

  // ══════════════════════════════════════════════════════════════════════
  // STUDENT GOALS
  // ══════════════════════════════════════════════════════════════════════

  getGoals: async (studentId) => {
    const res = await EA._api('GET', `/api/goals/${studentId}/`);
    return res.ok ? res.data.goals : { targetCgpa:'9.0', targetAccuracy:'85', weeklyHours:'12', targetMastery:'90' };
  },

  saveGoals: async (studentId, goals) => {
    return await EA._api('PUT', `/api/goals/${studentId}/`, goals);
  },

  // ══════════════════════════════════════════════════════════════════════
  // Q&A DOUBT SYSTEM
  // ══════════════════════════════════════════════════════════════════════

  getQA: async (studentId = null) => {
    const url = studentId ? `/api/qa/?student_id=${studentId}` : '/api/qa/';
    const res = await EA._api('GET', url);
    return res.ok ? res.data.qa : [];
  },

  addQuestion: async (studentId, studentName, topic, question) => {
    const res = await EA._api('POST', '/api/qa/', { studentId, studentName, topic, question });
    return res.ok ? res.data.qa : null;
  },

  answerQuestion: async (qaId, teacherName, answer) => {
    const res = await EA._api('PUT', `/api/qa/${qaId}/answer/`, { teacherName, answer });
    return res.ok ? res.data.qa : null;
  },

  // ══════════════════════════════════════════════════════════════════════
  // LEADERBOARD / RANKINGS
  // ══════════════════════════════════════════════════════════════════════

  getTopStudents: async (year = '', division = '', department = null) => {
    let url = '/api/leaderboard/?';
    if (department) url += `department=${encodeURIComponent(department)}&`;
    if (year)       url += `year=${encodeURIComponent(year)}&`;
    if (division)   url += `division=${encodeURIComponent(division)}&`;
    const res = await EA._api('GET', url);
    return res.ok ? res.data.students : [];
  },

  // ══════════════════════════════════════════════════════════════════════
  // INTERNSHIPS
  // ══════════════════════════════════════════════════════════════════════

  getInternships: async () => {
    const res = await EA._api('GET', '/api/internships/');
    return res.ok ? res.data.internships : [];
  },

  postInternship: async (internshipData) => {
    const res = await EA._api('POST', '/api/internships/', internshipData);
    return res.ok ? { ok: true, item: res.data.internship } : { ok: false };
  },

  deleteInternship: async (internshipId) => {
    const res = await EA._api('DELETE', `/api/internships/${internshipId}`);
    return { ok: res.ok };
  },

  // ══════════════════════════════════════════════════════════════════════
  // SYLLABUS & ADAPTIVE AI
  // ══════════════════════════════════════════════════════════════════════

  getSyllabi: async () => {
    const res = await EA._api('GET', '/api/syllabi/');
    return res.ok ? res.data.syllabi : [];
  },

  createSyllabus: async (syllabusData) => {
    const res = await EA._api('POST', '/api/syllabi/', syllabusData);
    return res.ok ? { ok: true, item: res.data.syllabus } : { ok: false };
  },

  generateSyllabusQuiz: async (unitId, unitTitle, concepts) => {
    const res = await EA._api('POST', '/api/syllabi/generate-quiz/', {
      unit_id: unitId, unit_title: unitTitle, concepts: concepts || []
    });
    return res.ok ? res.data.quiz_questions : [];
  },

  getRandomMCQSyllabusQuiz: async () => {
    const res = await EA._api('GET', '/api/syllabi/random-mcq-quiz/');
    return res.ok ? res.data.quiz_questions : [];
  },

  evaluateRemedialQuiz: async (quizQuestions, studentAnswers) => {
    const res = await EA._api('POST', '/api/syllabi/evaluate-remedial/', {
      quiz_questions: quizQuestions, student_answers: studentAnswers
    });
    return res.ok ? res.data.result : null;
  },

  // ══════════════════════════════════════════════════════════════════════
  // DEPARTMENT STRUCTURE (static — no DB needed)
  // ══════════════════════════════════════════════════════════════════════

  getDeptStructure: () => ({
    'Computer Science': {
      years: {
        'FY': { divisions: ['A', 'B'], subjects: ['C Programming', 'Digital Electronics', 'Applied Mathematics I', 'Physics'] },
        'SY': { divisions: ['A', 'B'], subjects: ['Data Structures & Algorithms', 'Database Management Systems', 'Discrete Mathematics', 'Computer Networks'] },
        'TY': { divisions: ['A', 'B'], subjects: ['Machine Learning', 'Web Development', 'Cloud Computing', 'Cyber Security', 'Deep Learning'] },
      }
    },
    'AI & Machine Learning': {
      years: {
        'FY': { divisions: ['A', 'B'], subjects: ['Python Programming', 'Mathematics for AI', 'Digital Logic'] },
        'SY': { divisions: ['A', 'B'], subjects: ['Data Structures', 'Probability & Statistics', 'Machine Learning Foundations'] },
        'TY': { divisions: ['A', 'B'], subjects: ['Deep Learning', 'Natural Language Processing', 'Computer Vision', 'Reinforcement Learning'] },
      }
    }
  }),

  // ══════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════════════════════════════════════

  avatar: name => (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
  fmtDate: iso => new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
  fmtTimeSeconds: secs => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60), s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
};

// NOTE: No more EA.seed() — all demo data is now loaded by the server
// into the real database automatically when the server starts.
// See: database/init_db.py
