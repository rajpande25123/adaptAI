// EduAdapt AI — Shared Data Layer & State Management (localStorage)
const EA = {
  get: k => JSON.parse(localStorage.getItem(k) || 'null'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),

  getUsers: () => JSON.parse(localStorage.getItem('ea_users') || '[]'),
  saveUsers: u => localStorage.setItem('ea_users', JSON.stringify(u)),

  getSession: () => JSON.parse(localStorage.getItem('ea_session') || 'null'),
  setSession: u => localStorage.setItem('ea_session', JSON.stringify(u)),
  logout: () => { localStorage.removeItem('ea_session'); window.location.href = '/'; },

  getStudents: () => EA.getUsers().filter(u => u.role === 'student'),
  getTeachers: () => EA.getUsers().filter(u => u.role === 'teacher'),
  getHODs: () => EA.getUsers().filter(u => u.role === 'hod'),

  getUserById: id => EA.getUsers().find(u => u.id === id) || null,

  registerUser: data => {
    const users = EA.getUsers();
    if (users.find(u => u.email === data.email)) return { ok: false, msg: 'Email address already registered.' };
    const user = { ...data, id: 'u_' + Date.now() };
    users.push(user);
    EA.saveUsers(users);
    return { ok: true, user };
  },

  createTeacherByHOD: teacherData => {
    const users = EA.getUsers();
    if (users.find(u => u.email === teacherData.email)) return { ok: false, msg: 'Teacher with this email already exists.' };
    const newTeacher = {
      ...teacherData,
      role: 'teacher',
      id: 't_' + Date.now(),
    };
    users.push(newTeacher);
    EA.saveUsers(users);
    return { ok: true, teacher: newTeacher };
  },

  loginUser: (email, password, role) => {
    const cleanInput = (email || '').trim().toLowerCase();
    const user = EA.getUsers().find(u => {
      const uEmail = (u.email || '').toLowerCase();
      const uEmailPrefix = uEmail.split('@')[0];
      const matchIdentifier = uEmail === cleanInput || uEmailPrefix === cleanInput;
      return matchIdentifier && u.password === password && u.role === role;
    });
    if (!user) return null;
    EA.setSession(user);
    return user;
  },

  // ── Records ──────────────────────────────────────
  getRecord: studentId => {
    const all = JSON.parse(localStorage.getItem('ea_records') || '{}');
    return all[studentId] || EA.blankRecord();
  },
  saveRecord: (studentId, record) => {
    const all = JSON.parse(localStorage.getItem('ea_records') || '{}');
    all[studentId] = record;
    localStorage.setItem('ea_records', JSON.stringify(all));
  },
  blankRecord: () => ({
    cgpa: { sem1:'', sem2:'', sem3:'', sem4:'', sem5:'', sem6:'' },
    assignments: [],
    classTests: [],
    attendance: '85',
    behavior: 'Punctual, attentive in class.',
    remarks: [],
  }),

  // ── Quizzes ──────────────────────────────────────
  getQuizzes: () => JSON.parse(localStorage.getItem('ea_quizzes') || '[]'),
  saveQuizzes: q => localStorage.setItem('ea_quizzes', JSON.stringify(q)),

  createQuiz: quiz => {
    const list = EA.getQuizzes();
    quiz.id = 'q_' + Date.now();
    quiz.proctored = quiz.proctored !== undefined ? quiz.proctored : true;
    quiz.maxViolations = parseInt(quiz.maxViolations) || 3;
    quiz.createdAt = new Date().toISOString();
    list.push(quiz);
    EA.saveQuizzes(list);
    return quiz;
  },

  getAvailableQuizzes: (year, division, department) => {
    const quizzes = EA.getQuizzes();
    return quizzes.filter(q => {
      const matchYear = !q.targetYear || q.targetYear === 'All' || q.targetYear === '' || !year || q.targetYear === year;
      const matchDiv = !q.targetDivision || q.targetDivision === 'All' || q.targetDivision === '' || !division || q.targetDivision === division;
      return matchYear && matchDiv;
    });
  },

  // ── Submissions with Time Taken Analysis ─────────
  getSubmissions: () => JSON.parse(localStorage.getItem('ea_submissions') || '[]'),
  saveSubmissions: s => localStorage.setItem('ea_submissions', JSON.stringify(s)),

  getStudentSubmissions: studentId =>
    EA.getSubmissions().filter(s => s.studentId === studentId),

  getQuizSubmissions: quizId =>
    EA.getSubmissions().filter(s => s.quizId === quizId),

  hasSubmitted: (quizId, studentId) =>
    EA.getSubmissions().some(s => s.quizId === quizId && s.studentId === studentId),

  submitQuiz: sub => {
    const list = EA.getSubmissions();
    sub.id = 's_' + Date.now();
    sub.submittedAt = new Date().toISOString();
    list.push(sub);
    EA.saveSubmissions(list);
    return sub;
  },

  // ── Student Goal Setting ─────────────────────────
  getGoals: studentId => {
    const all = JSON.parse(localStorage.getItem('ea_goals') || '{}');
    return all[studentId] || {
      targetCgpa: '9.0',
      targetAccuracy: '85',
      weeklyHours: '12',
      targetMastery: '90'
    };
  },

  saveGoals: (studentId, goals) => {
    const all = JSON.parse(localStorage.getItem('ea_goals') || '{}');
    all[studentId] = goals;
    localStorage.setItem('ea_goals', JSON.stringify(all));
  },

  // ── Q & A Doubt System ───────────────────────────
  getQA: () => JSON.parse(localStorage.getItem('ea_qa') || '[]'),
  saveQA: qa => localStorage.setItem('ea_qa', JSON.stringify(qa)),

  addQuestion: (studentId, studentName, topic, question) => {
    const list = EA.getQA();
    const item = {
      id: 'qa_' + Date.now(),
      studentId,
      studentName,
      topic,
      question,
      answer: '',
      teacherName: '',
      status: 'pending', // 'pending' | 'resolved'
      createdAt: new Date().toISOString()
    };
    list.unshift(item);
    EA.saveQA(list);
    return item;
  },

  answerQuestion: (qaId, teacherName, answer) => {
    const list = EA.getQA();
    const item = list.find(q => q.id === qaId);
    if (item) {
      item.answer = answer;
      item.teacherName = teacherName;
      item.status = 'resolved';
      item.answeredAt = new Date().toISOString();
      EA.saveQA(list);
    }
    return item;
  },

  // ── Department & Student Rankings ─────────────────
  getTopStudents: (year = '', division = '', department = null) => {
    const students = EA.getStudents().filter(s =>
      (!department || s.department === department) &&
      (!year || s.year === year) &&
      (!division || s.division === division)
    );
    return students.map(s => {
      const rec = EA.getRecord(s.id);
      const cgpas = Object.values(rec.cgpa).filter(v => v !== '').map(Number);
      const avgCgpa = cgpas.length ? cgpas.reduce((a,b) => a+b, 0)/cgpas.length : 0;
      const subs = EA.getStudentSubmissions(s.id);
      const quizAvg = subs.length ? subs.reduce((a,b) => a + (b.score/b.total*100), 0)/subs.length : 82;
      const att = parseFloat(rec.attendance || 88);
      const aiScoreIndex = parseFloat(Math.min(100, (avgCgpa * 7.5 + quizAvg * 0.15 + att * 0.1)).toFixed(1));
      return {
        ...s,
        avgCgpa: parseFloat(avgCgpa.toFixed(2)),
        quizAccuracy: Math.round(quizAvg),
        attendance: att,
        aiScoreIndex
      };
    }).sort((a,b) => b.aiScoreIndex - a.aiScoreIndex);
  },

  // ── Dept Structure ───────────────────────────────
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

  // ── Seed Demo Data ────────────────────────────────
  seed: () => {
    let users = EA.getUsers();

    const aimlHod = {
      id: 'hod_aiml', role: 'hod',
      name: 'Prof. AIML HOD', email: 'aimlhod', password: 'Pass',
      employeeId: 'HOD-AIML-01', department: 'AI & Machine Learning', phone: '+91 98765 00001',
    };

    const aimlTeach = {
      id: 't_aiml', role: 'teacher',
      name: 'Prof. AIML Teacher', email: 'aimlteach', password: 'Pass',
      employeeId: 'EMP-AIML-101', department: 'AI & Machine Learning', phone: '+91 98765 00002',
      subjects: ['Machine Learning', 'Deep Learning', 'Natural Language Processing', 'Artificial Intelligence'],
    };

    // Upsert aimlhod
    const hodIdx = users.findIndex(u => u.email === 'aimlhod' || u.id === 'hod_aiml');
    if (hodIdx >= 0) {
      users[hodIdx] = { ...users[hodIdx], ...aimlHod };
    } else {
      users.push(aimlHod);
    }

    // Upsert aimlteach
    const teachIdx = users.findIndex(u => u.email === 'aimlteach' || u.id === 't_aiml');
    if (teachIdx >= 0) {
      users[teachIdx] = { ...users[teachIdx], ...aimlTeach };
    } else {
      users.push(aimlTeach);
    }

    // Default demo users if missing
    if (!users.some(u => u.id === 'hod_1')) {
      users.push(
        {
          id: 'hod_1', role: 'hod',
          name: 'Dr. Ramesh Patil', email: 'hod@edu.ai', password: 'hod123',
          employeeId: 'HOD-CS-01', department: 'Computer Science', phone: '+91 98765 43211',
        },
        {
          id: 't_1', role: 'teacher',
          name: 'Prof. Anjali Sharma', email: 'teacher@edu.ai', password: 'teacher123',
          employeeId: 'EMP-CS-101', department: 'Computer Science', phone: '+91 98765 43210',
          subjects: ['Machine Learning', 'Data Structures & Algorithms', 'Deep Learning'],
        },
        {
          id: 't_2', role: 'teacher',
          name: 'Prof. Rohan Mehta', email: 'teacher2@edu.ai', password: 'teacher123',
          employeeId: 'EMP-CS-102', department: 'Computer Science', phone: '+91 98765 43220',
          subjects: ['Web Development', 'Cloud Computing'],
        },
        {
          id: 't_3', role: 'teacher',
          name: 'Dr. Vikramaditya Joshi', email: 'teacher3@edu.ai', password: 'teacher123',
          employeeId: 'EMP-CS-103', department: 'Computer Science', phone: '+91 98765 43230',
          subjects: ['Cyber Security', 'Database Management Systems'],
        },
        {
          id: 'stu_demo', role: 'student',
          name: 'Alex Rivera', email: 'demo@edu.ai', password: 'demo123',
          prn: 'PRN2021001', year: 'TY', division: 'A', department: 'Computer Science',
          phone: '+91 98765 43212', address: '12, FC Road, Shivaji Nagar, Pune 411016',
          parentName: 'Carlos Rivera', parentPhone: '+91 98765 43213', parentEmail: 'carlos@example.com',
          linkedin: 'linkedin.com/in/alexrivera', github: 'github.com/alexrivera',
          leetcode: 'leetcode.com/alexrivera', hackerrank: 'hackerrank.com/alexrivera',
        },
        {
          id: 'stu_2', role: 'student',
          name: 'Priya Sharma', email: 'priya@edu.ai', password: 'priya123',
          prn: 'PRN2021002', year: 'TY', division: 'A', department: 'Computer Science',
          phone: '+91 91234 56789', address: '45, Kothrud, Pune 411038',
          parentName: 'Suresh Sharma', parentPhone: '+91 91234 56780', parentEmail: 'suresh@example.com',
          linkedin: 'linkedin.com/in/priyasharma', github: 'github.com/priyasharma',
          leetcode: 'leetcode.com/priyasharma', hackerrank: '',
        },
        {
          id: 'stu_3', role: 'student',
          name: 'Rahul Desai', email: 'rahul@edu.ai', password: 'rahul123',
          prn: 'PRN2021003', year: 'SY', division: 'B', department: 'Computer Science',
          phone: '+91 92345 67890', address: '7, Aundh, Pune 411007',
          parentName: 'Vijay Desai', parentPhone: '+91 92345 67891', parentEmail: 'vijay@example.com',
          linkedin: '', github: 'github.com/rahuldesai', leetcode: '', hackerrank: '',
        }
      );
    }

    EA.saveUsers(users);

    // Initial records if not saved
    if (!localStorage.getItem('ea_records')) {
      EA.saveRecord('stu_demo', {
        cgpa: { sem1:'8.4', sem2:'8.1', sem3:'8.6', sem4:'8.9', sem5:'9.1', sem6:'' },
        assignments: [
          { id:'a1', title:'ML Lab 1 — Linear & Logistic Regression', submitted:true, onTime:true, marks:19, maxMarks:20 },
          { id:'a2', title:'DSA Assignment — Binary Search Trees', submitted:true, onTime:false, marks:16, maxMarks:20 },
          { id:'a3', title:'Cloud Computing Deployment Mini-Project', submitted:true, onTime:true, marks:28, maxMarks:30 },
        ],
        classTests: [
          { id:'ct1', title:'Unit Test 1 — Machine Learning', marks:23, maxMarks:25, date:'2024-02-10' },
          { id:'ct2', title:'Unit Test 2 — Cloud Architecture', marks:21, maxMarks:25, date:'2024-03-15' },
        ],
        attendance: '88',
        behavior: 'Active participant in discussions. Good grasp of concepts, high potential.',
        remarks: [
          { teacherName:'Prof. Anjali Sharma', text:'Excellent logic in Machine Learning. Practice more gradient calculations.', date:'2024-03-20' }
        ],
      });

      EA.saveRecord('stu_2', {
        cgpa: { sem1:'9.2', sem2:'9.0', sem3:'9.4', sem4:'9.3', sem5:'9.5', sem6:'' },
        assignments: [
          { id:'a1', title:'ML Lab 1', submitted:true, onTime:true, marks:20, maxMarks:20 },
          { id:'a2', title:'DSA Assignment', submitted:true, onTime:true, marks:20, maxMarks:20 },
        ],
        classTests: [
          { id:'ct1', title:'Unit Test 1 — Machine Learning', marks:25, maxMarks:25, date:'2024-02-10' },
        ],
        attendance: '96',
        behavior: 'Top performer in class. Always submits work ahead of deadline.',
        remarks: [],
      });
    }

    // Initial Quizzes if not saved
    if (!localStorage.getItem('ea_quizzes')) {
      EA.saveQuizzes([
        {
          id: 'q_demo_proctored',
          title: '🧪 AI Proctored Assessment — Machine Learning & Malpractice Monitor Test',
          subject: 'Machine Learning',
          targetYear: 'TY', targetDivision: 'A', department: 'Computer Science',
          teacherId: 't_aiml', teacherName: 'Prof. AIML Teacher',
          dueDate: '2026-08-30',
          proctored: true,
          maxViolations: 3,
          questions: [
            { q: 'In gradient descent, what happens if the learning rate alpha is set too large?', opts: ['Overshooting the minimum', 'Faster exact convergence', 'Zero gradient', 'Vanishing weights'], ans: 0 },
            { q: 'What is the derivative of f(x) = 3x² + 5x?', opts: ['6x + 5', '3x + 5', '6x²', '5x'], ans: 0 },
            { q: 'Which loss function is commonly used for binary classification?', opts: ['Binary Cross-Entropy', 'Mean Squared Error', 'Hinge Loss', 'Categorical Cross-Entropy'], ans: 0 },
            { q: 'What is the primary role of Activation Functions in Neural Networks?', opts: ['Introduce non-linearity', 'Normalize inputs', 'Reduce dataset size', 'Calculate learning rate'], ans: 0 }
          ]
        },
        {
          id: 'q_demo_1',
          title: 'Machine Learning & Optimization Quiz',
          subject: 'Machine Learning',
          targetYear: 'TY', targetDivision: 'A', department: 'Computer Science',
          teacherId: 't_aiml', teacherName: 'Prof. AIML Teacher',
          dueDate: '2026-08-20',
          proctored: true,
          maxViolations: 3,
          questions: [
            { q: 'In gradient descent, what happens if the learning rate alpha is set too large?', opts: ['Overshooting the minimum', 'Faster exact convergence', 'Zero gradient', 'Vanishing weights'], ans: 0 },
            { q: 'What is the derivative of f(x) = 3x² + 5x?', opts: ['6x + 5', '3x + 5', '6x²', '5x'], ans: 0 },
            { q: 'Which loss function is commonly used for binary classification?', opts: ['Binary Cross-Entropy', 'Mean Squared Error', 'Hinge Loss', 'Categorical Cross-Entropy'], ans: 0 }
          ]
        }
      ]);
    }

    // Initial Submissions if not saved
    if (!localStorage.getItem('ea_submissions')) {
      EA.saveSubmissions([
        {
          id: 's_demo_1',
          quizId: 'q_demo_1',
          studentId: 'stu_demo',
          score: 3, total: 3,
          timeTakenSeconds: 145,
          submittedAt: new Date().toISOString(),
          answers: { 0: 0, 1: 0, 2: 0 }
        }
      ]);
    }

    // Initial Q&A demo items if not saved
    if (!localStorage.getItem('ea_qa')) {
      EA.saveQA([
        {
          id: 'qa_1',
          studentId: 'stu_demo',
          studentName: 'Alex Rivera',
          topic: 'Gradient Descent & Partial Derivatives',
          question: 'Why does gradient descent overshoot when learning rate alpha is set too high?',
          answer: 'When alpha is too large, the update step delta = alpha * gradient steps past the minimum into regions of higher gradient, causing divergence instead of step-by-step minimization.',
          teacherName: 'Prof. AIML Teacher',
          status: 'resolved',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          answeredAt: new Date().toISOString()
        },
        {
          id: 'qa_2',
          studentId: 'stu_2',
          studentName: 'Priya Sharma',
          topic: 'Loss Functions',
          question: 'When should we use Binary Cross-Entropy over Mean Squared Error in classification?',
          answer: '',
          teacherName: '',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ]);
    }
  },

  // ── Internship Opportunities (Real-time DB Sync) ─────
  getInternships: async () => {
    try {
      const res = await fetch('/api/internships/');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.internships) {
          localStorage.setItem('ea_internships', JSON.stringify(data.internships));
          return data.internships;
        }
      }
    } catch (err) {
      console.warn('[EduAdapt AI] API offline, loading cached internships:', err);
    }
    return JSON.parse(localStorage.getItem('ea_internships') || '[]');
  },

  postInternship: async (internshipData) => {
    try {
      const res = await fetch('/api/internships/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(internshipData)
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, item: data.internship };
      }
    } catch (err) {
      console.warn('[EduAdapt AI] Offline fallback posting internship:', err);
    }
    // Fallback if offline
    const list = JSON.parse(localStorage.getItem('ea_internships') || '[]');
    const newItem = {
      id: 'intern_' + Date.now(),
      ...internshipData,
      timestamp: new Date().toLocaleString()
    };
    list.unshift(newItem);
    localStorage.setItem('ea_internships', JSON.stringify(list));
    return { ok: true, item: newItem };
  },

  deleteInternship: async (internshipId) => {
    try {
      const res = await fetch(`/api/internships/${internshipId}`, { method: 'DELETE' });
      if (res.ok) {
        return { ok: true };
      }
    } catch (err) {
      console.warn('[EduAdapt AI] Offline fallback deleting internship:', err);
    }
    const list = JSON.parse(localStorage.getItem('ea_internships') || '[]');
    const filtered = list.filter(i => i.id !== internshipId);
    localStorage.setItem('ea_internships', JSON.stringify(filtered));
    return { ok: true };
  },

  // ── SYLLABUS & ADAPTIVE AI REMEDIAL METHODS ─────────────────────
  getSyllabi: async () => {
    try {
      const res = await fetch('/api/syllabi/');
      if (res.ok) {
        const data = await res.json();
        return data.syllabi || [];
      }
    } catch (err) {
      console.warn('[EduAdapt AI] Offline fallback fetching syllabi:', err);
    }
    return [
      {
        id: "syl_ml_ai_2026",
        title: "Machine Learning & Artificial Intelligence (AI-2026)",
        department: "Computer Science & AIML",
        author: "Dr. Rajesh Sharma (HOD)",
        code: "CS-AI-501",
        description: "Comprehensive curriculum covering linear algebra, multivariate calculus, optimization, deep neural networks, and computer vision.",
        units: [
          {
            unit_id: "u1",
            unit_number: 1,
            title: "Unit 1: Linear Algebra & Matrix Operations",
            description: "Foundations of linear equations, matrix multiplication, rank, eigenvalues, and vector spaces.",
            concepts: ["algebra", "linear_equations", "matrix_operations"],
            learning_goals: ["Solve system of linear equations", "Calculate matrix products", "Vector spaces"]
          },
          {
            unit_id: "u2",
            unit_number: 2,
            title: "Unit 2: Calculus, Derivatives & Optimization",
            description: "Differential calculus, partial derivatives, gradient vectors, and gradient descent optimization.",
            concepts: ["derivatives", "partial_derivatives", "optimization"],
            learning_goals: ["Compute partial derivatives", "Learning rate alpha convergence", "Local minima"]
          },
          {
            unit_id: "u3",
            unit_number: 3,
            title: "Unit 3: Deep Neural Networks & Loss Functions",
            description: "Multi-layer perceptrons, activation functions, cross-entropy loss, and backpropagation.",
            concepts: ["neural_networks", "loss_functions", "backpropagation"],
            learning_goals: ["Derive backpropagation chain rule", "Binary Cross-Entropy Loss", "ReLU & Sigmoid"]
          }
        ]
      }
    ];
  },

  createSyllabus: async (syllabusData) => {
    try {
      const res = await fetch('/api/syllabi/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syllabusData)
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, item: data.syllabus };
      }
    } catch (err) {
      console.warn('[EduAdapt AI] Offline fallback creating syllabus:', err);
    }
    return { ok: true, item: syllabusData };
  },

  generateSyllabusQuiz: async (unitId, unitTitle, concepts) => {
    try {
      const res = await fetch('/api/syllabi/generate-quiz/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit_id: unitId, unit_title: unitTitle, concepts: concepts || [] })
      });
      if (res.ok) {
        const data = await res.json();
        return data.quiz_questions || [];
      }
    } catch (err) {
      console.warn('[EduAdapt AI] Offline fallback generating quiz:', err);
    }
    return [
      {
        id: "q_fallback_1",
        q: "What is the partial derivative with respect to x of f(x, y) = 3x^2*y?",
        opts: ["6xy", "3x^2", "6x", "3y"],
        ans: 0,
        explanation: "Treat y as constant: d/dx[3x^2] * y = 6x * y = 6xy.",
        concept: "partial_derivatives"
      },
      {
        id: "q_fallback_2",
        q: "In gradient descent, what happens if learning rate alpha is set too high?",
        opts: ["Overshooting minimum and divergence", "Faster exact convergence", "Zero gradient", "Weights freeze"],
        ans: 0,
        explanation: "Excessive learning rate causes step sizes to overshoot the loss minimum.",
        concept: "optimization"
      }
    ];
  },

  evaluateRemedialQuiz: async (quizQuestions, studentAnswers) => {
    try {
      const res = await fetch('/api/syllabi/evaluate-remedial/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_questions: quizQuestions, student_answers: studentAnswers })
      });
      if (res.ok) {
        const data = await res.json();
        return data.result;
      }
    } catch (err) {
      console.warn('[EduAdapt AI] Offline fallback evaluating quiz:', err);
    }
    return {
      score_pct: 60,
      correct_count: 3,
      total_questions: 5,
      needs_improvement: true,
      concept_gaps: ["partial_derivatives", "optimization"],
      detailed_breakdown: [],
      remedial_lessons: [
        {
          concept: "partial_derivatives",
          title: "Multivariate Partial Derivatives",
          explanation: "Partial derivatives evaluate slope along one axis holding others constant.",
          formula: "d/dx [x^n * y^m] = n * x^(n-1) * y^m"
        }
      ],
      remedial_quiz_questions: []
    };
  },

  avatar: name => (name || 'U').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2),
  fmtDate: iso => new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
  fmtTimeSeconds: secs => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
};

EA.seed();

