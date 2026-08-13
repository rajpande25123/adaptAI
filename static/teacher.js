// teacher.js — Teacher Portal Logic
const session = EA.getSession();
if (!session || session.role !== 'teacher') window.location.href = '/';

document.addEventListener('DOMContentLoaded', () => {
  EA.seed();
  document.getElementById('t-avatar').textContent = EA.avatar(session.name);
  document.getElementById('t-name').textContent = session.name;
  renderStudentList();
  renderTeacherAnalytics();
  renderTeacherQA();
  populateMarksSel();
  populateQuizSel();
  renderPublishedQuizzes();
  loadQuizResults();
});

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (event && event.currentTarget && event.currentTarget.classList) {
    event.currentTarget.classList.add('active');
  }
  if (name === 'results') loadQuizResults();
  if (name === 'analytics') renderTeacherAnalytics();
  if (name === 'qa') renderTeacherQA();
  if (name === 'internships') renderTeacherInternships();
  if (name === 'syllabus-upload') renderTeacherSyllabi();
}

// ── TEACHER SYLLABUS UPLOAD & MANAGEMENT ───────────
async function handleTeacherUploadSyllabus(e) {
  e.preventDefault();
  const title = document.getElementById('syl-title').value.trim();
  const code = document.getElementById('syl-code').value.trim() || 'CS-101';
  const dept = document.getElementById('syl-dept').value.trim() || 'Computer Science';

  const u1Title = document.getElementById('syl-u1-title').value.trim();
  const u1Desc = document.getElementById('syl-u1-desc').value.trim();
  const u1ConceptsStr = document.getElementById('syl-u1-concepts').value.trim();
  const u1GoalsStr = document.getElementById('syl-u1-goals').value.trim();

  const concepts = u1ConceptsStr ? u1ConceptsStr.split(',').map(s => s.trim()) : ['algebra', 'derivatives', 'optimization'];
  const goals = u1GoalsStr ? u1GoalsStr.split(',').map(s => s.trim()) : ['Master unit concepts'];

  const syllabusData = {
    title,
    code,
    department: dept,
    author: `${session.name} (Faculty)`,
    description: `Uploaded by ${session.name}. Includes Unit 1 diagnostic quiz generation capabilities.`,
    units: [
      {
        unit_id: 'u1_' + Date.now(),
        unit_number: 1,
        title: u1Title,
        description: u1Desc,
        concepts: concepts,
        learning_goals: goals
      }
    ]
  };

  const res = await EA.createSyllabus(syllabusData);
  if (res.ok) {
    // Also auto-generate and publish quiz for student dashboard Quizzes section
    const generatedQ = await EA.generateSyllabusQuiz(syllabusData.units[0].unit_id, u1Title, concepts);
    if (generatedQ && generatedQ.length) {
      EA.createQuiz({
        title: `Syllabus Quiz: ${u1Title}`,
        subject: title,
        targetYear: '',
        targetDivision: '',
        department: dept,
        teacherId: session.id,
        teacherName: session.name,
        proctored: false,
        questions: generatedQ.map(q => ({ q: q.q, opts: q.opts, ans: q.ans }))
      });
    }

    document.getElementById('syl-title').value = '';
    const msg = document.getElementById('syl-pub-msg');
    if (msg) {
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 3500);
    }
    renderTeacherSyllabi();
  }
}

async function renderTeacherSyllabi() {
  const el = document.getElementById('teacher-syllabi-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b">Loading active syllabi...</div>';

  const list = await EA.getSyllabi();
  if (!list || !list.length) {
    el.innerHTML = '<p class="text-muted" style="text-align:center;padding:30px">No syllabi uploaded yet.</p>';
    return;
  }

  el.innerHTML = list.map(item => `
    <div style="padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px">
      <div style="font-weight:700;font-size:15px;color:#1e1b4b">${item.title} (${item.code || 'CS-101'})</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">Author: ${item.author || 'Faculty'} · Dept: ${item.department}</div>
      <div style="margin-top:10px;padding:10px;background:#fff;border-radius:8px;border:1px solid #cbd5e1">
        <div style="font-weight:700;font-size:13px;color:#4338ca">Unit 1: ${item.units[0]?.title || 'Unit 1'}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">${item.units[0]?.description || ''}</div>
        <div style="font-size:11px;color:#059669;margin-top:4px">Concepts: ${(item.units[0]?.concepts || []).join(', ')}</div>
      </div>
    </div>
  `).join('');
}

// ── TEACHER INTERNSHIPS MANAGEMENT ──────────────────
async function handleTeacherPostInternship(e) {
  e.preventDefault();
  const data = {
    title: document.getElementById('ti-title').value.trim(),
    company: document.getElementById('ti-company').value.trim(),
    location: document.getElementById('ti-location').value.trim() || 'Remote / Hybrid',
    stipend: document.getElementById('ti-stipend').value.trim() || 'Stipend Provided',
    target_year: document.getElementById('ti-year').value,
    deadline: document.getElementById('ti-deadline').value || '2026-12-31',
    apply_url: document.getElementById('ti-url').value.trim(),
    description: document.getElementById('ti-desc').value.trim(),
    posted_by: `${session.name} (Faculty)`
  };

  const res = await EA.postInternship(data);
  if (res.ok) {
    document.getElementById('ti-title').value = '';
    document.getElementById('ti-company').value = '';
    document.getElementById('ti-location').value = '';
    document.getElementById('ti-stipend').value = '';
    document.getElementById('ti-url').value = '';
    document.getElementById('ti-desc').value = '';

    const msg = document.getElementById('ti-msg');
    if (msg) {
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 3500);
    }
    renderTeacherInternships();
  }
}

async function renderTeacherInternships() {
  const el = document.getElementById('teacher-internships-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b">Loading active internships...</div>';

  const list = await EA.getInternships();
  if (!list || !list.length) {
    el.innerHTML = '<p class="text-muted" style="text-align:center;padding:30px">No active internships posted yet.</p>';
    return;
  }

  el.innerHTML = list.map(item => `
    <div style="padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <span class="badge badge-purple" style="font-size:11px">${item.company}</span>
          <div style="font-weight:700;font-size:15px;color:#1e1b4b;margin-top:2px">${item.title}</div>
        </div>
        <button class="btn btn-outline btn-sm" style="color:#ef4444;border-color:#fca5a5" onclick="deleteInternshipByTeacher('${item.id}')">🗑️ Delete</button>
      </div>
      <div style="font-size:12px;color:#64748b;margin-top:6px;line-height:1.5">${item.description.slice(0, 110)}...</div>
      <div style="display:flex;gap:12px;margin-top:10px;font-size:11px;color:#94a3b8">
        <span>📍 ${item.location}</span>
        <span>💰 ${item.stipend}</span>
        <span>👨‍🏫 ${item.posted_by}</span>
      </div>
    </div>
  `).join('');
}

async function deleteInternshipByTeacher(id) {
  if (!confirm('Are you sure you want to delete this internship posting?')) return;
  await EA.deleteInternship(id);
  renderTeacherInternships();
}

// ── OVERALL QUIZ ANALYTICS & TOPIC PIE CHARTS ──────
let chartTopicPie = null;
let chartPerfPie = null;

function renderTeacherAnalytics() {
  const students = EA.getStudents();
  const subs = EA.getSubmissions();
  const quizzes = EA.getQuizzes();

  const totalSubs = subs.length;
  const avgAccuracy = subs.length ? Math.round(subs.reduce((a,b)=>a+(b.score/b.total*100),0)/subs.length) : 80;

  const statsEl = document.getElementById('teacher-analytics-stats');
  if (statsEl) {
    statsEl.innerHTML = [
      ['Total Students Monitored', students.length, '#6366f1'],
      ['Total Quiz Attempts', totalSubs, '#059669'],
      ['Class Quiz Accuracy', avgAccuracy+'%', '#f59e0b'],
      ['Active Quizzes', quizzes.length, '#06b6d4'],
    ].map(([l,v,c])=>`
      <div class="stat-card">
        <div class="stat-label">${l}</div>
        <div class="stat-value" style="color:${c}">${v}</div>
      </div>`).join('');
  }

  // Render Topic Pie Chart
  const ctxTopic = document.getElementById('chart-topic-pie');
  if (ctxTopic) {
    if (chartTopicPie) chartTopicPie.destroy();
    chartTopicPie = new Chart(ctxTopic, {
      type: 'pie',
      data: {
        labels: ['Proficient (Mastered)', 'Developing (Average)', 'Lacking (Critical Gaps)'],
        datasets: [{
          data: [45, 35, 20],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  // Render Performance Pie Chart
  const ctxPerf = document.getElementById('chart-performance-pie');
  if (ctxPerf) {
    if (chartPerfPie) chartPerfPie.destroy();
    chartPerfPie = new Chart(ctxPerf, {
      type: 'doughnut',
      data: {
        labels: ['High Performers (CGPA > 8.5)', 'Average Performers (CGPA 7.0 - 8.5)', 'At-Risk Students (CGPA < 7.0)'],
        datasets: [{
          data: [50, 38, 12],
          backgroundColor: ['#6366f1', '#06b6d4', '#ec4899']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  // Render Weak Topics List
  const weakEl = document.getElementById('teacher-weak-topics-list');
  if (weakEl) {
    const weakTopics = [
      { topic: 'Calculus & Derivatives', unit: 'Unit 2: Optimization', lackingStudents: 3, avgAccuracy: '45%' },
      { topic: 'Partial Derivatives & Gradients', unit: 'Unit 3: Multivariable Calculus', lackingStudents: 4, avgAccuracy: '38%' },
      { topic: 'Loss Functions & Binary Cross-Entropy', unit: 'Unit 4: Neural Networks', lackingStudents: 2, avgAccuracy: '52%' }
    ];

    weakEl.innerHTML = weakTopics.map(t => `
      <div style="padding:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:700;color:#991b1b;font-size:15px">${t.topic}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">${t.unit} · Class Avg Accuracy: <strong style="color:#b91c1c">${t.avgAccuracy}</strong></div>
        </div>
        <div style="text-align:right">
          <span class="badge badge-red" style="font-size:13px;padding:6px 12px">⚠️ ${t.lackingStudents} Students Lacking</span>
        </div>
      </div>`).join('');
  }
}

// ── TEACHER Q & A HUB ──────────────────────────────
function renderTeacherQA() {
  const list = EA.getQA();
  const el = document.getElementById('teacher-qa-list');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<p class="text-muted" style="text-align:center;padding:30px">No student questions submitted yet.</p>';
    return;
  }

  el.innerHTML = list.map(q => `
    <div style="padding:16px;background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <strong style="font-size:14px;color:#1f2937">${q.studentName}</strong>
          <span style="font-size:12px;color:#6b7280;margin-left:8px">(${q.topic})</span>
        </div>
        <span class="badge ${q.status==='resolved'?'badge-green':'badge-amber'}">${q.status==='resolved'?'Answered':'Pending Answer'}</span>
      </div>
      <div style="font-size:14px;color:#374151;margin-bottom:10px">❓ ${q.question}</div>
      ${q.answer ? `
        <div style="padding:10px 12px;background:#ecfdf5;border-left:3px solid #10b981;border-radius:6px;font-size:13px;color:#065f46">
          <strong>Your Answer:</strong> ${q.answer}
        </div>` : `
        <div style="margin-top:10px;display:flex;gap:8px">
          <input id="ans-inp-${q.id}" placeholder="Type your official explanation to answer this student..." style="flex:1;padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit">
          <button class="btn btn-indigo btn-sm" onclick="submitTeacherAnswer('${q.id}')">Submit Reply</button>
        </div>`}
      <div style="font-size:11px;color:#9ca3af;margin-top:8px">${EA.fmtDate(q.createdAt)}</div>
    </div>`).join('');
}

function submitTeacherAnswer(qaId) {
  const inp = document.getElementById(`ans-inp-${qaId}`);
  const answer = (inp?.value || '').trim();
  if (!answer) return;

  EA.answerQuestion(qaId, session.name, answer);
  renderTeacherQA();
}

// ── STUDENT LIST ───────────────────────────────────
function renderStudentList() {
  const q = (document.getElementById('stu-search')?.value || '').toLowerCase();
  const yr = document.getElementById('stu-filter-year')?.value || '';
  const dv = document.getElementById('stu-filter-div')?.value || '';

  let students = EA.getStudents().filter(s =>
    (!q || s.name.toLowerCase().includes(q) || s.prn?.toLowerCase().includes(q)) &&
    (!yr || s.year === yr) &&
    (!dv || s.division === dv)
  );

  const el = document.getElementById('student-list');
  if (!students.length) { el.innerHTML = '<p class="text-muted" style="padding:24px">No students match your filter criteria.</p>'; return; }
  
  el.innerHTML = students.map(s => `
    <div class="stu-row" onclick="viewStudent('${s.id}')">
      <div class="avatar" style="width:38px;height:38px;font-size:14px;background:#6366f1;color:#fff;flex-shrink:0">${EA.avatar(s.name)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">${s.name}</div>
        <div style="font-size:12px;color:#6b7280">${s.prn || 'No PRN'} · ${s.year || '?'}-${s.division || '?'} · ${s.department || ''}</div>
      </div>
      <div style="font-size:12px;color:#6b7280">${s.phone || ''}</div>
    </div>`).join('');
}

function viewStudent(id) {
  const s = EA.getUserById(id);
  if (!s) return;
  const rec = EA.getRecord(id);
  const cgpaVals = Object.values(rec.cgpa).filter(v => v !== '').map(Number);
  const avgCgpa = cgpaVals.length ? (cgpaVals.reduce((a,b)=>a+b,0)/cgpaVals.length).toFixed(2) : '—';
  const subPct = rec.assignments.length ? Math.round(rec.assignments.filter(a=>a.submitted).length/rec.assignments.length*100) : 0;
  const onTime = rec.assignments.filter(a=>a.submitted&&a.onTime).length;

  document.querySelectorAll('.stu-row').forEach(r => r.classList.remove('selected'));
  if (event.currentTarget) event.currentTarget.classList.add('selected');

  const links = [
    s.linkedin && `<a href="https://${s.linkedin.replace('https://','')}" target="_blank" class="profile-link">LinkedIn</a>`,
    s.github && `<a href="https://${s.github.replace('https://','')}" target="_blank" class="profile-link">GitHub</a>`,
    s.leetcode && `<a href="https://${s.leetcode.replace('https://','')}" target="_blank" class="profile-link">LeetCode</a>`,
    s.hackerrank && `<a href="https://${s.hackerrank.replace('https://','')}" target="_blank" class="profile-link">HackerRank</a>`,
  ].filter(Boolean).join(' ');

  const cgpaRows = Object.entries(rec.cgpa).map(([sem,v]) =>
    `<td style="padding:8px 12px;text-align:center;font-weight:${v?'600':'400'};color:${v?'#111':'#9ca3af'}">${v||'—'}</td>`).join('');

  const assignRows = rec.assignments.map(a => `
    <tr>
      <td style="padding:8px 12px">${a.title}</td>
      <td style="padding:8px 12px;text-align:center"><span class="badge ${a.submitted?'badge-green':'badge-red'}">${a.submitted?'Submitted':'Not Submitted'}</span></td>
      <td style="padding:8px 12px;text-align:center"><span class="badge ${a.onTime?'badge-green':'badge-amber'}">${a.submitted?(a.onTime?'On Time':'Late'):'—'}</span></td>
      <td style="padding:8px 12px;text-align:center">${a.submitted?`${a.marks}/${a.maxMarks}`:'—'}</td>
    </tr>`).join('');

  const testRows = rec.classTests.map(t => `
    <tr>
      <td style="padding:8px 12px">${t.title}</td>
      <td style="padding:8px 12px;text-align:center">${t.date||'—'}</td>
      <td style="padding:8px 12px;text-align:center;font-weight:600;color:${t.marks/t.maxMarks>=0.6?'#059669':'#dc2626'}">${t.marks}/${t.maxMarks}</td>
    </tr>`).join('');

  const remarkRows = rec.remarks.map(r => `
    <div style="padding:12px;background:#f8f9fc;border-radius:8px;margin-bottom:8px;font-size:13px;border-left:3px solid #6366f1">
      <div style="font-weight:600;color:#374151">${r.teacherName}</div>
      <div style="color:#374151;margin-top:2px">${r.text}</div>
      <div style="color:#9ca3af;font-size:11px;margin-top:4px">${EA.fmtDate(r.date)}</div>
    </div>`).join('');

  document.getElementById('student-detail-panel').innerHTML = `
    <div class="card" style="padding:0;overflow:hidden">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#6366f1,#818cf8);padding:24px;color:#fff">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="width:56px;height:56px;background:rgba(255,255,255,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">${EA.avatar(s.name)}</div>
          <div>
            <div style="font-size:20px;font-weight:700">${s.name}</div>
            <div style="opacity:.88;font-size:13px">${s.prn||'No PRN'} · ${s.year||'?'}-${s.division||'?'} · ${s.department||''}</div>
          </div>
          <div style="margin-left:auto">
            <span style="background:rgba(255,255,255,.2);padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600">Attendance: ${rec.attendance||'—'}%</span>
          </div>
        </div>
      </div>

      <div style="padding:24px;display:flex;flex-direction:column;gap:20px">
        <!-- Quick stats -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
          ${[['Avg CGPA',avgCgpa,'#6366f1'],['Assignments',subPct+'% done','#059669'],['On Time',onTime+' of '+rec.assignments.filter(a=>a.submitted).length,'#f59e0b'],['Tests',rec.classTests.length+' taken','#06b6d4']].map(([l,v,c])=>`
          <div style="background:#f8f9fc;border-radius:10px;padding:12px">
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${l}</div>
            <div style="font-size:18px;font-weight:700;color:${c}">${v}</div>
          </div>`).join('')}
        </div>

        <!-- Personal Info -->
        <div>
          <div class="section-label">Contact & Personal Details</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
            ${[['Email',s.email],['Phone',s.phone||'—'],['Address',s.address||'—'],['Parent Name',s.parentName||'—'],['Parent Phone',s.parentPhone||'—'],['Parent Email',s.parentEmail||'—']].map(([l,v])=>`
            <div style="padding:8px 12px;background:#f8f9fc;border-radius:8px"><span style="color:#6b7280">${l}: </span><strong>${v}</strong></div>`).join('')}
          </div>
          ${links ? `<div style="margin-top:12px">${links}</div>` : ''}
        </div>

        <!-- CGPA Semester-wise -->
        <div>
          <div class="section-label">CGPA History (Semesters 1-6)</div>
          <table class="data-table"><thead><tr>${['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'].map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody><tr>${cgpaRows}</tr></tbody></table>
        </div>

        <!-- Assignments -->
        <div>
          <div class="section-label">Assignments & Submissions</div>
          ${rec.assignments.length ? `<table class="data-table"><thead><tr><th>Title</th><th>Status</th><th>Timeliness</th><th>Marks</th></tr></thead><tbody>${assignRows}</tbody></table>` : '<p class="text-muted">No assignments recorded.</p>'}
        </div>

        <!-- Class Tests -->
        <div>
          <div class="section-label">Class & Unit Tests</div>
          ${rec.classTests.length ? `<table class="data-table"><thead><tr><th>Title</th><th>Date</th><th>Score</th></tr></thead><tbody>${testRows}</tbody></table>` : '<p class="text-muted">No tests recorded.</p>'}
        </div>

        <!-- Behavior -->
        <div>
          <div class="section-label">Class Behavioral Remarks</div>
          <div style="padding:12px;background:#f8f9fc;border-radius:8px;font-size:13px;color:#374151">${rec.behavior||'No notes added.'}</div>
        </div>

        <!-- Remarks -->
        <div>
          <div class="section-label">Teacher Remarks & Interventions</div>
          ${remarkRows || '<p class="text-muted" style="font-size:13px">No remarks recorded yet.</p>'}
          <div style="margin-top:12px;display:flex;gap:8px">
            <input id="new-remark-${id}" style="flex:1;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit" placeholder="Add a remark for this student…">
            <button class="btn btn-indigo btn-sm" onclick="addRemark('${id}')">Add Remark</button>
          </div>
        </div>
      </div>
    </div>`;
}

function addRemark(studentId) {
  const inp = document.getElementById(`new-remark-${studentId}`);
  const text = inp.value.trim();
  if (!text) return;
  const rec = EA.getRecord(studentId);
  rec.remarks.push({ teacherName: session.name, text, date: new Date().toISOString() });
  EA.saveRecord(studentId, rec);
  inp.value = '';
  viewStudent(studentId);
}

// ── MARKS FORM ─────────────────────────────────────
function populateMarksSel() {
  const sel = document.getElementById('marks-student-sel');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select student —</option>';
  EA.getStudents().forEach(s => {
    sel.innerHTML += `<option value="${s.id}">${s.name} (${s.prn||'No PRN'}) — ${s.year||'?'}-${s.division||'?'}</option>`;
  });
}

function loadMarksForm() {
  const id = document.getElementById('marks-student-sel').value;
  if (!id) return;
  const s = EA.getUserById(id);
  const rec = EA.getRecord(id);

  document.getElementById('marks-form-area').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <!-- CGPA -->
      <div class="card">
        <div class="card-title">📊 Update CGPA (Semesters 1 - 6) for ${s.name}</div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px">
          ${Object.entries(rec.cgpa).map(([sem,val])=>`
          <div class="field-sm" style="margin:0">
            <label>${sem.replace('sem','Sem ')}</label>
            <input id="cgpa-${sem}" value="${val}" type="number" min="0" max="10" step="0.1" placeholder="—">
          </div>`).join('')}
        </div>
      </div>

      <!-- Attendance & Behavior -->
      <div class="card">
        <div class="card-title">📋 Attendance & Classroom Behavior</div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:12px">
          <div class="field-sm" style="margin:0"><label>Attendance %</label><input id="att-val" value="${rec.attendance}" type="number" min="0" max="100" placeholder="e.g. 88"></div>
          <div class="field-sm" style="margin:0"><label>Behavior Remarks</label><input id="beh-val" value="${rec.behavior}" placeholder="e.g. Attentive in class, good group collaboration…"></div>
        </div>
      </div>

      <!-- Assignments -->
      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>📌 Assignments</span>
          <button class="btn btn-outline btn-sm" onclick="addAssignmentRow()">+ Add Assignment</button>
        </div>
        <div id="assign-rows">
          ${rec.assignments.map((a,i)=>`
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;margin-bottom:8px;align-items:center">
            <input value="${a.title}" placeholder="Assignment title" oninput="updateAssign(${i},'title',this.value)" style="padding:8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit">
            <select oninput="updateAssign(${i},'submitted',this.value==='true')" style="padding:8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit">
              <option value="false" ${!a.submitted?'selected':''}>Not Submitted</option>
              <option value="true" ${a.submitted?'selected':''}>Submitted</option>
            </select>
            <select oninput="updateAssign(${i},'onTime',this.value==='true')" style="padding:8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit">
              <option value="false" ${!a.onTime?'selected':''}>Late</option>
              <option value="true" ${a.onTime?'selected':''}>On Time</option>
            </select>
            <input value="${a.marks}" type="number" placeholder="Marks" oninput="updateAssign(${i},'marks',+this.value)" style="padding:8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit">
            <input value="${a.maxMarks}" type="number" placeholder="Max Marks" oninput="updateAssign(${i},'maxMarks',+this.value)" style="padding:8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit">
          </div>`).join('')}
        </div>
      </div>

      <!-- Unit Tests -->
      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>🧪 Class / Unit Tests</span>
          <button class="btn btn-outline btn-sm" onclick="addTestRow()">+ Add Test</button>
        </div>
        <div id="test-rows">
          ${rec.classTests.map((t,i)=>`
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin-bottom:8px">
            <input value="${t.title}" placeholder="Test title" oninput="updateTest(${i},'title',this.value)" style="padding:8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit">
            <input value="${t.date}" type="date" oninput="updateTest(${i},'date',this.value)" style="padding:8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit">
            <input value="${t.marks}" type="number" placeholder="Marks" oninput="updateTest(${i},'marks',+this.value)" style="padding:8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit">
            <input value="${t.maxMarks}" type="number" placeholder="Max" oninput="updateTest(${i},'maxMarks',+this.value)" style="padding:8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit">
          </div>`).join('')}
        </div>
      </div>

      <button class="btn btn-indigo" onclick="saveMarks('${id}')">Save Student Record</button>
      <div id="marks-saved-msg" class="hidden" style="padding:10px;background:#ecfdf5;border-radius:8px;color:#065f46;font-size:13px">✓ Record updated successfully!</div>
    </div>`;

  window._currentRec = JSON.parse(JSON.stringify(rec));
  window._currentStudentId = id;
}

function updateAssign(i, field, val) { if(window._currentRec) window._currentRec.assignments[i][field] = val; }
function updateTest(i, field, val) { if(window._currentRec) window._currentRec.classTests[i][field] = val; }

function addAssignmentRow() {
  if (!window._currentRec) return;
  window._currentRec.assignments.push({ id:'a'+Date.now(), title:'', submitted:false, onTime:false, marks:0, maxMarks:20 });
  loadMarksForm();
}
function addTestRow() {
  if (!window._currentRec) return;
  window._currentRec.classTests.push({ id:'ct'+Date.now(), title:'', marks:0, maxMarks:25, date:'' });
  loadMarksForm();
}

function saveMarks(id) {
  const rec = window._currentRec || EA.getRecord(id);
  Object.keys(rec.cgpa).forEach(sem => {
    const el = document.getElementById('cgpa-'+sem);
    if (el) rec.cgpa[sem] = el.value;
  });
  const att = document.getElementById('att-val');
  const beh = document.getElementById('beh-val');
  if (att) rec.attendance = att.value;
  if (beh) rec.behavior = beh.value;

  EA.saveRecord(id, rec);
  const msg = document.getElementById('marks-saved-msg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 3000);
}

// ── QUIZ CREATION & AI SYLLABUS AUTO-GENERATION ──────
let questions = [];

async function autoGenerateQuizFromSyllabus() {
  const sel = document.getElementById('syl-quiz-unit-sel');
  const unitId = sel ? sel.value : 'u1';

  const syllabi = await EA.getSyllabi();
  let selectedUnit = null;
  if (syllabi && syllabi.length && syllabi[0].units) {
    selectedUnit = syllabi[0].units.find(u => u.unit_id === unitId) || syllabi[0].units[0];
  }

  if (!selectedUnit) {
    selectedUnit = {
      unit_id: 'u1',
      title: 'Unit 1: Linear Algebra & Differential Calculus Foundations',
      concepts: ['algebra', 'derivatives', 'partial_derivatives', 'optimization']
    };
  }

  const generatedQ = await EA.generateSyllabusQuiz(selectedUnit.unit_id, selectedUnit.title, selectedUnit.concepts);

  if (generatedQ && generatedQ.length) {
    questions = generatedQ.map(g => ({
      q: g.q,
      opts: g.opts,
      ans: g.ans
    }));

    const titleInput = document.getElementById('qz-title');
    const subjInput = document.getElementById('qz-subject');
    if (titleInput) titleInput.value = `AI Diagnostic Test — ${selectedUnit.title}`;
    if (subjInput) subjInput.value = 'AI & Machine Learning';

    renderQuestions();

    const msg = document.getElementById('syl-gen-msg');
    if (msg) {
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 4000);
    }
  }
}

function addQuestion() {
  questions.push({ q:'', opts:['','','',''], ans:0 });
  renderQuestions();
}

function renderQuestions() {
  document.getElementById('questions-list').innerHTML = questions.map((q,i) => `
    <div style="border:1.5px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px;background:#fafafa">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <strong style="font-size:13px;color:#374151">Question ${i+1}</strong>
        <button type="button" onclick="removeQ(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px">Remove</button>
      </div>
      <div class="field-sm" style="margin-bottom:10px">
        <label>Question text</label>
        <input value="${q.q}" oninput="questions[${i}].q=this.value" placeholder="Enter question statement…">
      </div>
      ${q.opts.map((opt,j)=>`
      <div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
        <input type="radio" name="ans-${i}" value="${j}" ${q.ans==j?'checked':''} onchange="questions[${i}].ans=${j}" title="Select as correct answer">
        <input value="${opt}" oninput="questions[${i}].opts[${j}]=this.value" placeholder="Option ${j+1}" style="flex:1;padding:7px 10px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit">
      </div>`).join('')}
      <p style="font-size:11px;color:#9ca3af;margin-top:4px">Select radio button to mark correct answer (hidden from students).</p>
    </div>`).join('');
}

function removeQ(i) { questions.splice(i,1); renderQuestions(); }

function saveQuiz() {
  const title = document.getElementById('qz-title').value.trim();
  if (!title || !questions.length) { alert('Please enter a quiz title and at least one question.'); return; }
  
  EA.createQuiz({
    title, subject: document.getElementById('qz-subject').value.trim(),
    targetYear: document.getElementById('qz-year').value,
    targetDivision: document.getElementById('qz-div').value,
    dueDate: document.getElementById('qz-due').value,
    department: session.department,
    teacherId: session.id, teacherName: session.name,
    proctored: document.getElementById('qz-proctored').checked,
    maxViolations: parseInt(document.getElementById('qz-max-violations').value) || 3,
    questions: questions.map(q => ({ q:q.q, opts:q.opts, ans:q.ans })),
  });

  questions = [];
  renderQuestions();
  document.getElementById('qz-title').value = '';
  document.getElementById('qz-msg').classList.remove('hidden');
  setTimeout(() => document.getElementById('qz-msg').classList.add('hidden'), 3000);
  renderPublishedQuizzes();
  populateQuizSel();
}

function renderPublishedQuizzes() {
  const list = EA.getQuizzes().filter(q => q.teacherId === session.id);
  document.getElementById('published-quiz-list').innerHTML = list.length
    ? list.map(q => `
      <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;background:#fff">
        <div style="font-weight:600;font-size:14px">${q.title}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">${q.subject||''} · ${q.targetYear||'All'}-${q.targetDivision||'All'} · ${q.questions.length} questions</div>
        ${q.dueDate?`<div style="font-size:11px;color:#9ca3af;margin-top:2px">Due Date: ${q.dueDate}</div>`:''}
      </div>`).join('')
    : '<p class="text-muted">No quizzes published yet.</p>';
}

// ── QUIZ RESULTS WITH TIME TAKEN ANALYSIS ─────────
function populateQuizSel() {
  const sel = document.getElementById('results-quiz-sel');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select quiz —</option>';
  EA.getQuizzes().filter(q => q.teacherId === session.id).forEach(q => {
    sel.innerHTML += `<option value="${q.id}">${q.title}</option>`;
  });
}

function loadQuizResults() {
  const id = document.getElementById('results-quiz-sel')?.value;
  const area = document.getElementById('results-area');
  if (!area) return;
  if (!id) { area.innerHTML = ''; return; }

  const quiz = EA.getQuizzes().find(q => q.id === id);
  const subs = EA.getQuizSubmissions(id);

  if (!subs.length) { area.innerHTML = '<div class="card"><p class="text-muted">No student submissions for this quiz yet.</p></div>'; return; }

  const avgScore = subs.reduce((a,s)=>a+(s.score/s.total),0)/subs.length*100;
  const times = subs.map(s => s.timeTakenSeconds || 0).filter(Boolean);
  const avgTimeSecs = times.length ? Math.round(times.reduce((a,b)=>a+b,0)/times.length) : 0;

  area.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:16px">
        <div style="background:#eef2ff;border-radius:10px;padding:16px;text-align:center;min-width:120px">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Submissions</div>
          <div style="font-size:26px;font-weight:700;color:#6366f1">${subs.length}</div>
        </div>
        <div style="background:#ecfdf5;border-radius:10px;padding:16px;text-align:center;min-width:120px">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Class Avg Score</div>
          <div style="font-size:26px;font-weight:700;color:#059669">${avgScore.toFixed(0)}%</div>
        </div>
        <div style="background:#fffbeb;border-radius:10px;padding:16px;text-align:center;min-width:140px">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase">Avg Time Taken</div>
          <div style="font-size:26px;font-weight:700;color:#d97706">${EA.fmtTimeSeconds(avgTimeSecs)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Detailed Student Analytics</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Student Name</th>
            <th>PRN</th>
            <th>Score</th>
            <th>Accuracy</th>
            <th>Time Taken</th>
            <th>Submitted At</th>
          </tr>
        </thead>
        <tbody>
          ${subs.map(sub => {
            const stu = EA.getUserById(sub.studentId);
            const pct = Math.round(sub.score/sub.total*100);
            return `<tr>
              <td style="padding:10px 12px;font-weight:600">${stu?.name||'Unknown'}</td>
              <td style="padding:10px 12px;color:#6b7280">${stu?.prn||'—'}</td>
              <td style="padding:10px 12px;font-weight:600">${sub.score}/${sub.total}</td>
              <td style="padding:10px 12px"><span class="badge ${pct>=60?'badge-green':'badge-red'}">${pct}%</span></td>
              <td style="padding:10px 12px;font-weight:600;color:#374151">⏱️ ${EA.fmtTimeSeconds(sub.timeTakenSeconds)}</td>
              <td style="padding:10px 12px;color:#6b7280;font-size:12px">${EA.fmtDate(sub.submittedAt)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}
