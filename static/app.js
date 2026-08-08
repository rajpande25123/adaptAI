// app.js — Student Dashboard & Multimodal AI Analyzer
const session = EA.getSession();
if (!session || session.role !== 'student') window.location.href = '/';

const CONCEPTS = {
  algebra:            { label:'Algebra & Equations',     default:0.85 },
  linear_equations:   { label:'Linear System Solvers',   default:0.70 },
  derivatives:        { label:'Calculus & Derivatives', default:0.45 },
  partial_derivatives:{ label:'Partial Derivatives',     default:0.25 },
  optimization:       { label:'Optimization & Gradient', default:0.20 },
  matrix_operations:  { label:'Matrix Operations',       default:0.65 },
};

let perfValues = {};
Object.keys(CONCEPTS).forEach(k => { perfValues[k] = CONCEPTS[k].default; });
let lastDiagnosis = null;
let quizStartTime = null;

document.addEventListener('DOMContentLoaded', () => {
  EA.seed();
  document.getElementById('s-avatar').textContent = EA.avatar(session.name);
  document.getElementById('s-name').textContent = session.name;
  document.getElementById('s-year').textContent = `${session.year||'?'}-${session.division||'?'} · ${session.department||''}`;
  document.getElementById('s-greeting').textContent = `Welcome back, ${session.name.split(' ')[0]}!`;
  buildSliders();
  renderOverview();
  renderGoals();
  renderStudentCharts();
  renderStudentQA();
  renderReport();
  renderQuizList();
  renderProfile();
});

// ── GOALS & COMMITMENT TRACKER ─────────────────────
function renderGoals() {
  const g = EA.getGoals(session.id);
  const rec = EA.getRecord(session.id);
  const cgpaVals = Object.values(rec.cgpa).filter(v=>v!=='').map(Number);
  const currentCgpa = cgpaVals.length ? cgpaVals[cgpaVals.length-1] : 0;
  
  const targetCgpa = parseFloat(g.targetCgpa) || 9.0;
  const targetAcc = parseFloat(g.targetAccuracy) || 85;
  const targetHours = parseFloat(g.weeklyHours) || 12;

  // Set inputs if present
  if (document.getElementById('goal-cgpa')) {
    document.getElementById('goal-cgpa').value = g.targetCgpa;
    document.getElementById('goal-accuracy').value = g.targetAccuracy;
    document.getElementById('goal-hours').value = g.weeklyHours;
    document.getElementById('goal-mastery').value = g.targetMastery;
  }

  // Calculate commitment score %
  const cgpaRatio = Math.min(1.0, currentCgpa / targetCgpa);
  const subs = EA.getStudentSubmissions(session.id);
  const quizAvg = subs.length ? (subs.reduce((a,b)=>a+(b.score/b.total*100),0)/subs.length) : 75;
  const accRatio = Math.min(1.0, quizAvg / targetAcc);

  const commitmentScore = Math.round(((cgpaRatio * 0.6) + (accRatio * 0.4)) * 100);
  const statusBadge = commitmentScore >= 85 ? '<span class="badge badge-green">🚀 On Track — Highly Committed</span>' : '<span class="badge badge-amber">⚠️ Attention Needed — Boost Practice</span>';

  const el = document.getElementById('goal-commitment-card');
  if (!el) return;
  el.innerHTML = `
    <div style="padding:16px;background:#f8f9fc;border-radius:12px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-weight:700;font-size:15px;color:#374151">Overall Goal Commitment Index</div>
        <div>${statusBadge}</div>
      </div>
      <div style="font-size:36px;font-weight:800;color:#6366f1">${commitmentScore}%</div>
      <div class="bar-track" style="height:10px;margin-top:8px"><div class="bar-fill good" style="width:${commitmentScore}%"></div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="padding:12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px">
        <div style="font-size:12px;color:#6b7280">Current vs Target CGPA</div>
        <div style="font-size:18px;font-weight:700;color:#374151;margin-top:4px">${currentCgpa.toFixed(2)} / <span style="color:#6366f1">${targetCgpa.toFixed(1)}</span></div>
      </div>
      <div style="padding:12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px">
        <div style="font-size:12px;color:#6b7280">Quiz Accuracy Target</div>
        <div style="font-size:18px;font-weight:700;color:#059669;margin-top:4px">${Math.round(quizAvg)}% / <span style="color:#059669">${targetAcc}%</span></div>
      </div>
    </div>`;
}

function saveStudentGoals(e) {
  e.preventDefault();
  const goals = {
    targetCgpa: document.getElementById('goal-cgpa').value,
    targetAccuracy: document.getElementById('goal-accuracy').value,
    weeklyHours: document.getElementById('goal-hours').value,
    targetMastery: document.getElementById('goal-mastery').value
  };
  EA.saveGoals(session.id, goals);
  const msg = document.getElementById('goal-msg');
  if (msg) { msg.classList.remove('hidden'); setTimeout(()=>msg.classList.add('hidden'), 3000); }
  renderGoals();
  renderStudentCharts();
}

// ── VISUAL ANALYTICS CHARTS ────────────────────────
let chartCgpa = null;
let chartBatch = null;

function renderStudentCharts() {
  const rec = EA.getRecord(session.id);
  const goals = EA.getGoals(session.id);
  const targetCgpa = parseFloat(goals.targetCgpa) || 9.0;

  const semesters = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'];
  const semValues = Object.values(rec.cgpa).slice(0,5).map(v => v ? parseFloat(v) : null);
  const targetLine = semesters.map(() => targetCgpa);

  // 1. CGPA Line Chart
  const ctxCgpa = document.getElementById('chart-cgpa-trend');
  if (ctxCgpa) {
    if (chartCgpa) chartCgpa.destroy();
    chartCgpa = new Chart(ctxCgpa, {
      type: 'line',
      data: {
        labels: semesters,
        datasets: [
          {
            label: 'Actual CGPA',
            data: semValues,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3
          },
          {
            label: 'Target Goal CGPA',
            data: targetLine,
            borderColor: '#f59e0b',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 6, max: 10 } }
      }
    });
  }

  // 2. Student vs Class Concept Radar/Bar Chart
  const concepts = Object.keys(CONCEPTS);
  const conceptLabels = concepts.map(k => CONCEPTS[k].label);
  const studentScores = concepts.map(k => Math.round(perfValues[k] * 100));
  // Mock benchmark class averages for comparison
  const batchAverages = [78, 65, 60, 50, 55, 70];

  const ctxBatch = document.getElementById('chart-batch-comparison');
  if (ctxBatch) {
    if (chartBatch) chartBatch.destroy();
    chartBatch = new Chart(ctxBatch, {
      type: 'bar',
      data: {
        labels: conceptLabels,
        datasets: [
          {
            label: 'My Score (%)',
            data: studentScores,
            backgroundColor: '#6366f1',
            borderRadius: 6
          },
          {
            label: 'Class Average (%)',
            data: batchAverages,
            backgroundColor: '#cbd5e1',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 0, max: 100 } }
      }
    });
  }

  // 3. Render Lacking Topics List
  renderStudentLackingTopics(concepts, studentScores, batchAverages);
}

function renderStudentLackingTopics(concepts, studentScores, batchAverages) {
  const el = document.getElementById('student-lacking-topics');
  if (!el) return;

  const lacking = [];
  concepts.forEach((k, idx) => {
    const sScore = studentScores[idx];
    const bAvg = batchAverages[idx];
    if (sScore < bAvg) {
      lacking.push({
        label: CONCEPTS[k].label,
        sScore,
        bAvg,
        delta: sScore - bAvg
      });
    }
  });

  if (!lacking.length) {
    el.innerHTML = '<div style="padding:16px;background:#ecfdf5;border-radius:8px;color:#065f46;font-size:13px;text-align:center">🎉 Great work! Your score is equal to or above the class average across all topics!</div>';
    return;
  }

  el.innerHTML = lacking.map(item => `
    <div style="padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <strong style="color:#b91c1c">${item.label}</strong>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">Your Score: ${item.sScore}% · Class Average: ${item.bAvg}%</div>
      </div>
      <span class="badge badge-red" style="font-size:13px">${item.delta}% below class avg</span>
    </div>`).join('');
}

// ── Q & A FORUM ────────────────────────────────────
function renderStudentQA() {
  const list = EA.getQA().filter(q => q.studentId === session.id);
  const el = document.getElementById('student-qa-list');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<p class="text-muted" style="text-align:center;padding:30px">You haven\'t posted any questions yet. Use the form to ask a doubt!</p>';
    return;
  }

  el.innerHTML = list.map(q => `
    <div style="padding:14px;background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="badge badge-purple" style="font-size:11px">${q.topic}</span>
        <span class="badge ${q.status==='resolved'?'badge-green':'badge-amber'}">${q.status==='resolved'?'Answered':'Pending Faculty Answer'}</span>
      </div>
      <div style="font-weight:600;font-size:14px;color:#1f2937;margin-top:4px">${q.question}</div>
      ${q.answer ? `
        <div style="margin-top:10px;padding:10px 12px;background:#eef2ff;border-left:3px solid #6366f1;border-radius:6px;font-size:13px;color:#374151">
          <strong>Faculty Reply (${q.teacherName}):</strong><br>
          ${q.answer}
        </div>` : ''}
      <div style="font-size:11px;color:#9ca3af;margin-top:8px">${EA.fmtDate(q.createdAt)}</div>
    </div>`).join('');
}

function postStudentQuestion(e) {
  e.preventDefault();
  const topic = document.getElementById('qa-topic').value;
  const question = document.getElementById('qa-question').value;

  EA.addQuestion(session.id, session.name, topic, question);
  document.getElementById('qa-topic').value = '';
  document.getElementById('qa-question').value = '';
  renderStudentQA();
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('page-' + name);
  if (el) el.classList.add('active');
  if (window.event && window.event.currentTarget && window.event.currentTarget.classList) {
    window.event.currentTarget.classList.add('active');
  }

  if (name === 'quizzes') renderQuizList();
  if (name === 'overview') renderOverview();
  if (name === 'goals') renderGoals();
  if (name === 'qa') renderStudentQA();
  if (name === 'report') renderReport();
  if (name === 'profile') renderProfile();
  if (name === 'internships') renderStudentInternships();
  if (name === 'syllabus') renderStudentSyllabus();
}

// ── SYLLABUS & ADAPTIVE AI REMEDIAL ENGINE ─────────
let currentSyllabusQuiz = [];
let currentSyllabusQuizAnswers = {};

async function renderStudentSyllabus() {
  const container = document.getElementById('student-syllabus-container');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b">Loading curriculum syllabus...</div>';

  const syllabi = await EA.getSyllabi();
  if (!syllabi || !syllabi.length) {
    container.innerHTML = '<p class="text-muted">No syllabus found.</p>';
    return;
  }

  const syl = syllabi[0];
  container.innerHTML = `
    <div style="padding:16px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;margin-bottom:16px">
      <div style="font-weight:800;font-size:16px;color:#1e1b4b">${syl.title}</div>
      <div style="font-size:12px;color:#4338ca;margin-top:2px">Code: <strong>${syl.code}</strong> · ${syl.department} · Author: ${syl.author}</div>
      <div style="font-size:12px;color:#475569;margin-top:6px">${syl.description}</div>
    </div>

    ${syl.units.map(u => `
      <div class="card" style="margin-bottom:14px;border-left:4px solid #6366f1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-weight:700;font-size:15px;color:#1e1b4b">${u.title}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px">${u.description}</div>
          </div>
          <button class="btn btn-indigo btn-sm" onclick="startSyllabusQuiz('${u.unit_id}', '${u.title.replace(/'/g, "\\'")}', '${u.concepts.join(',')}')">
            ⚡ Generate AI Quiz
          </button>
        </div>

        <div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:8px">
          <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:4px">Target Learning Goals:</div>
          <ul style="font-size:12px;color:#64748b;padding-left:16px;margin:0">
            ${u.learning_goals ? u.learning_goals.map(g => `<li>${g}</li>`).join('') : '<li>Master core concepts</li>'}
          </ul>
        </div>
      </div>
    `).join('')}
  `;
}

async function startSyllabusQuiz(unitId, unitTitle, conceptsStr) {
  const quizArea = document.getElementById('student-syllabus-quiz-area');
  if (!quizArea) return;

  quizArea.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b">🧠 AI is analyzing syllabus unit and generating custom diagnostic quiz...</div>';

  const concepts = conceptsStr ? conceptsStr.split(',') : [];
  currentSyllabusQuiz = await EA.generateSyllabusQuiz(unitId, unitTitle, concepts);
  currentSyllabusQuizAnswers = {};

  if (!currentSyllabusQuiz || !currentSyllabusQuiz.length) {
    quizArea.innerHTML = '<p class="text-muted">Failed to generate quiz. Please try again.</p>';
    return;
  }

  quizArea.style.display = 'block';
  quizArea.innerHTML = `
    <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1.5px solid #e2e8f0">
      <div style="font-weight:800;font-size:16px;color:#1e1b4b">⚡ AI Diagnostic Quiz: ${unitTitle}</div>
      <div style="font-size:12px;color:#64748b">Answer the questions below to test your understanding. AI will evaluate gaps in real time.</div>
    </div>

    ${currentSyllabusQuiz.map((q, idx) => `
      <div style="padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:14px">
        <div style="font-weight:700;font-size:14px;color:#1e1b4b;margin-bottom:10px">Q${idx + 1}. ${q.q}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${q.opts.map((opt, optIdx) => `
            <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-size:13px">
              <input type="radio" name="syl_q_${idx}" value="${optIdx}" onchange="currentSyllabusQuizAnswers[${idx}]=${optIdx}">
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('')}

    <button class="btn btn-indigo" style="width:100%;margin-top:10px" onclick="submitSyllabusQuiz()">
      🧠 Submit & Generate AI Remedial Analysis
    </button>
  `;
}

async function submitSyllabusQuiz() {
  const quizArea = document.getElementById('student-syllabus-quiz-area');
  if (!quizArea) return;

  quizArea.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b">⏳ AI is analyzing your responses and generating personalized remedial explanations...</div>';

  const result = await EA.evaluateRemedialQuiz(currentSyllabusQuiz, currentSyllabusQuizAnswers);

  const scoreBadgeColor = result.score_pct >= 80 ? '#10b981' : result.score_pct >= 50 ? '#f59e0b' : '#ef4444';

  let breakdownHTML = result.detailed_breakdown.map(b => `
    <div style="padding:12px;border:1px solid ${b.is_correct ? '#bbf7d0' : '#fecaca'};background:${b.is_correct ? '#f0fdf4' : '#fef2f2'};border-radius:8px;margin-bottom:10px;font-size:13px">
      <div style="font-weight:700;color:${b.is_correct ? '#166534' : '#991b1b'}">${b.is_correct ? '✓ Correct' : '✗ Needs Improvement'} — Q: ${b.question}</div>
      <div style="color:#475569;margin-top:4px">Your Answer: <strong>${b.user_answer}</strong> | Correct: <strong>${b.correct_answer}</strong></div>
      <div style="font-size:12px;color:#334155;margin-top:6px;padding:8px;background:#fff;border-radius:6px">💡 <strong>AI Explanation:</strong> ${b.explanation}</div>
    </div>
  `).join('');

  let remedialHTML = '';
  if (result.needs_improvement && result.remedial_lessons && result.remedial_lessons.length > 0) {
    remedialHTML = `
      <div style="margin-top:20px;padding:16px;background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px">
        <div style="font-weight:800;font-size:16px;color:#92400e;margin-bottom:8px">💡 AI Topic Explanation & Step-by-Step Breakdown</div>
        <p style="font-size:12px;color:#78350f;margin-bottom:12px">AI identified key concept gaps in your quiz submission. Review the detailed explanations below to strengthen your understanding:</p>

        ${result.remedial_lessons.map(l => `
          <div style="padding:12px;background:#fff;border:1px solid #fcd34d;border-radius:8px;margin-bottom:10px">
            <div style="font-weight:700;font-size:14px;color:#b45309">${l.title}</div>
            <div style="font-size:13px;color:#451a03;margin-top:4px">${l.explanation}</div>
            <div style="margin-top:6px;padding:6px 10px;background:#fef3c7;border-radius:6px;font-family:monospace;font-size:12px;color:#92400e">
              📐 Formula / Rule: <strong>${l.formula}</strong>
            </div>
          </div>
        `).join('')}

        <button class="btn btn-amber" style="width:100%;margin-top:10px" onclick="startTargetedRemedialQuiz()">
          🚀 Take Follow-Up Targeted Practice Quiz
        </button>
      </div>
    `;
  } else if (!result.needs_improvement) {
    remedialHTML = `
      <div style="margin-top:20px;padding:16px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;text-align:center">
        <div style="font-size:32px;margin-bottom:4px">🎉 🏆</div>
        <div style="font-weight:800;font-size:16px;color:#166534">Outstanding Concept Mastery!</div>
        <div style="font-size:13px;color:#15803d;margin-top:4px">You scored ${result.score_pct}%! You have mastered this syllabus unit and are ready to advance to the next unit.</div>
      </div>
    `;
  }

  window._lastRemedialQuizQuestions = result.remedial_quiz_questions || [];

  quizArea.style.display = 'block';
  quizArea.innerHTML = `
    <div style="text-align:center;padding:16px;background:#f8fafc;border-radius:12px;margin-bottom:16px">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700">Quiz Accuracy Score</div>
      <div style="font-size:36px;font-weight:900;color:${scoreBadgeColor}">${result.score_pct}%</div>
      <div style="font-size:13px;color:#475569">${result.correct_count} of ${result.total_questions} Questions Correct</div>
    </div>

    <div style="font-weight:700;font-size:14px;color:#1e1b4b;margin-bottom:10px">Detailed Question Diagnostics:</div>
    ${breakdownHTML}
    ${remedialHTML}
  `;
}

function startTargetedRemedialQuiz() {
  const quizArea = document.getElementById('student-syllabus-quiz-area');
  if (!quizArea || !window._lastRemedialQuizQuestions || !window._lastRemedialQuizQuestions.length) {
    alert("Targeted questions generated!");
    return;
  }

  currentSyllabusQuiz = window._lastRemedialQuizQuestions;
  currentSyllabusQuizAnswers = {};

  quizArea.style.display = 'block';
  quizArea.innerHTML = `
    <div style="margin-bottom:16px;padding:12px;background:#fffbeb;border-radius:10px;border:1px solid #fde68a">
      <div style="font-weight:800;font-size:15px;color:#92400e">🚀 AI Targeted Practice Quiz</div>
      <div style="font-size:12px;color:#78350f">This quiz focuses specifically on the weak sub-topics identified during your previous test.</div>
    </div>

    ${currentSyllabusQuiz.map((q, idx) => `
      <div style="padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:14px">
        <div style="font-weight:700;font-size:14px;color:#1e1b4b;margin-bottom:10px">Q${idx + 1}. ${q.q}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${q.opts.map((opt, optIdx) => `
            <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-size:13px">
              <input type="radio" name="rem_q_${idx}" value="${optIdx}" onchange="currentSyllabusQuizAnswers[${idx}]=${optIdx}">
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('')}

    <button class="btn btn-indigo" style="width:100%;margin-top:10px" onclick="submitSyllabusQuiz()">
      🧠 Evaluate Practice Quiz
    </button>
  `;
}

// ── REAL-TIME INTERNSHIPS (STUDENT VIEW) ───────────
async function renderStudentInternships() {
  const el = document.getElementById('student-internship-grid');
  if (!el) return;
  el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#64748b">Loading real-time internships...</div>';

  const internships = await EA.getInternships();
  if (!internships || !internships.length) {
    el.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;padding:50px"><div style="font-size:44px;margin-bottom:12px">💼</div><h3>No Internships Posted Yet</h3><p class="text-muted">Check back soon! HOD and Faculty members post new opportunities regularly.</p></div>';
    return;
  }

  el.innerHTML = internships.map(item => `
    <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;border-top:4px solid #6366f1;position:relative">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <span class="badge badge-purple" style="margin-bottom:6px">${item.company || 'Organization'}</span>
            <h3 style="font-size:17px;font-weight:700;color:#1e1b4b;margin-top:4px">${item.title}</h3>
          </div>
          <span class="badge badge-green" style="font-size:12px;padding:5px 10px">${item.stipend || 'Stipend'}</span>
        </div>

        <p style="font-size:13px;color:#475569;margin-bottom:16px;line-height:1.6">${item.description}</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px;background:#f8fafc;border-radius:10px;font-size:12px;color:#64748b;margin-bottom:16px">
          <div>📍 <strong>Location:</strong> ${item.location || 'Remote'}</div>
          <div>📅 <strong>Deadline:</strong> ${item.deadline || 'Open'}</div>
          <div>🎓 <strong>Target Year:</strong> ${item.target_year || 'All'}</div>
          <div>👨‍🏫 <strong>Posted By:</strong> ${item.posted_by || 'Faculty'}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #e2e8f0">
        <span style="font-size:11px;color:#94a3b8">Posted: ${item.timestamp || 'Recent'}</span>
        <a href="${item.apply_url || '#'}" target="_blank" class="btn btn-indigo btn-sm" style="text-decoration:none">🚀 Apply Now →</a>
      </div>
    </div>
  `).join('');
}

// ── OVERVIEW ───────────────────────────────────────
function renderOverview() {
  const rec = EA.getRecord(session.id);
  const cgpaVals = Object.values(rec.cgpa).filter(v=>v!=='').map(Number);
  const latestCgpa = cgpaVals.length ? cgpaVals[cgpaVals.length-1].toFixed(2) : '—';
  const subPct = rec.assignments.length ? Math.round(rec.assignments.filter(a=>a.submitted).length/rec.assignments.length*100) : 0;
  const scores = Object.values(perfValues);
  const avgM = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*100);

  document.getElementById('s-stats').innerHTML = [
    ['Latest CGPA', latestCgpa, '#6366f1'],
    ['AI Mastery Index', avgM+'%', '#059669'],
    ['Assignments Completed', subPct+'%', '#f59e0b'],
    ['Class Attendance', rec.attendance ? rec.attendance+'%' : '—', '#06b6d4'],
  ].map(([l,v,c])=>`
    <div class="stat-card">
      <div class="stat-label">${l}</div>
      <div class="stat-value" style="color:${c}">${v}</div>
    </div>`).join('');

  // Concept bars
  document.getElementById('ov-concept-list').innerHTML = Object.entries(CONCEPTS).map(([k,meta])=>{
    const val = perfValues[k]; const pct = Math.round(val*100);
    const cls = val>=0.7?'good':val>=0.5?'ok':'bad';
    return `<div class="concept-item">
      <div class="concept-name">${meta.label}</div>
      <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div>
      <div class="bar-pct" style="color:${val>=0.7?'#10b981':val>=0.5?'#f59e0b':'#ef4444'}">${pct}%</div>
    </div>`;
  }).join('');

  // Gaps
  const weak = Object.entries(CONCEPTS).filter(([k])=>perfValues[k]<0.6);
  document.getElementById('ov-gaps-list').innerHTML = weak.length
    ? weak.map(([k,meta])=>`<div class="gap-item"><h4>${meta.label}</h4><p>Current Mastery: ${Math.round(perfValues[k]*100)}% — intervention recommended</p></div>`).join('')
    : '<p class="text-muted" style="padding:12px;text-align:center">No critical learning gaps identified!</p>';
}

// ── REPORT (FROM TEACHER) ──────────────────────────
function renderReport() {
  const rec = EA.getRecord(session.id);
  const cgpaVals = Object.values(rec.cgpa).filter(v=>v!=='').map(Number);
  const avg = cgpaVals.length ? (cgpaVals.reduce((a,b)=>a+b,0)/cgpaVals.length).toFixed(2) : '—';

  document.getElementById('report-content').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <!-- CGPA -->
      <div class="card">
        <div class="card-title">📊 Academic Performance (CGPA History)</div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px">
          ${Object.entries(rec.cgpa).map(([sem,v])=>`
          <div style="background:${v?'#eef2ff':'#f8f9fc'};border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">${sem.replace('sem','Sem ')}</div>
            <div style="font-size:22px;font-weight:700;color:${v?'#6366f1':'#d1d5db'}">${v||'—'}</div>
          </div>`).join('')}
        </div>
        <div style="margin-top:14px;font-size:14px;color:#374151">Overall Cumulative Average CGPA: <strong style="color:#6366f1">${avg}</strong></div>
      </div>

      <!-- Assignments -->
      <div class="card">
        <div class="card-title">📌 Coursework & Assignments</div>
        ${rec.assignments.length ? `
        <table class="data-table">
          <thead><tr><th>Assignment Title</th><th>Submission Status</th><th>Timeliness</th><th>Score</th></tr></thead>
          <tbody>
            ${rec.assignments.map(a=>`
            <tr>
              <td style="padding:10px 12px;font-weight:500">${a.title}</td>
              <td style="padding:10px 12px"><span class="badge ${a.submitted?'badge-green':'badge-red'}">${a.submitted?'Submitted':'Not Submitted'}</span></td>
              <td style="padding:10px 12px"><span class="badge ${a.onTime?'badge-green':'badge-amber'}">${a.submitted?(a.onTime?'On Time':'Late Submission'):'—'}</span></td>
              <td style="padding:10px 12px;font-weight:600">${a.submitted?`${a.marks}/${a.maxMarks}`:'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<p class="text-muted">No assignment records entered by teacher yet.</p>'}
      </div>

      <!-- Unit Tests -->
      <div class="card">
        <div class="card-title">🧪 Unit & Class Assessment Tests</div>
        ${rec.classTests.length ? `
        <table class="data-table">
          <thead><tr><th>Test Name</th><th>Date</th><th>Score</th><th>Performance Grade</th></tr></thead>
          <tbody>
            ${rec.classTests.map(t=>{
              const pct = Math.round(t.marks/t.maxMarks*100);
              return `<tr>
                <td style="padding:10px 12px;font-weight:500">${t.title}</td>
                <td style="padding:10px 12px;color:#6b7280">${t.date||'—'}</td>
                <td style="padding:10px 12px;font-weight:600">${t.marks}/${t.maxMarks}</td>
                <td style="padding:10px 12px"><span class="badge ${pct>=75?'badge-green':pct>=50?'badge-amber':'badge-red'}">${pct}%</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>` : '<p class="text-muted">No test records entered by teacher yet.</p>'}
      </div>

      <!-- Behavior & Attendance -->
      <div class="grid-2">
        <div class="card">
          <div class="card-title">📅 Overall Class Attendance</div>
          <div style="font-size:48px;font-weight:700;color:${parseFloat(rec.attendance||0)>=75?'#059669':'#ef4444'};text-align:center;padding:16px 0">${rec.attendance||'—'}%</div>
          <p style="text-align:center;font-size:13px;color:#6b7280">${parseFloat(rec.attendance||0)<75?'⚠️ Below 75% attendance threshold':'✓ Good attendance standing'}</p>
        </div>
        <div class="card">
          <div class="card-title">📝 Faculty Behavioral Notes</div>
          <div style="font-size:13px;color:#374151;line-height:1.7">${rec.behavior||'No behavioral notes added yet.'}</div>
        </div>
      </div>

      <!-- Teacher Remarks -->
      <div class="card">
        <div class="card-title">💬 Faculty Feedback & Remarks</div>
        ${rec.remarks.length
          ? rec.remarks.map(r=>`
            <div style="padding:14px;background:#f8f9fc;border-radius:8px;margin-bottom:10px;border-left:3px solid #6366f1">
              <div style="font-weight:600;font-size:13px;color:#374151">${r.teacherName}</div>
              <div style="font-size:13px;color:#374151;margin-top:4px">${r.text}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:6px">${EA.fmtDate(r.date)}</div>
            </div>`).join('')
          : '<p class="text-muted">No formal teacher remarks added yet.</p>'}
      </div>
    </div>`;
}

// ── QUIZZES & TIMER TRACKING ───────────────────────
function renderQuizList() {
  const quizzes = EA.getAvailableQuizzes(session.year, session.division, session.department);
  const el = document.getElementById('quiz-list');
  if (!quizzes.length) {
    el.innerHTML = '<div class="card" style="text-align:center;padding:40px"><div style="font-size:36px;margin-bottom:12px">✏️</div><p class="text-muted">No quizzes currently assigned for your class.</p></div>';
    return;
  }
  el.innerHTML = quizzes.map(q => {
    const submitted = EA.hasSubmitted(q.id, session.id);
    const sub = submitted ? EA.getStudentSubmissions(session.id).find(s=>s.quizId===q.id) : null;
    const pct = sub ? Math.round(sub.score/sub.total*100) : null;
    const isProctored = q.proctored !== false;

    return `
      <div class="card mb-20" style="display:flex;align-items:center;gap:16px;background:#fff;border-left:${isProctored?'4px solid #ef4444':'4px solid #6366f1'}">
        <div style="font-size:32px">${isProctored?'📹':'📝'}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:16px;font-weight:700">${q.title}</span>
            ${isProctored ? `<span class="badge badge-red" style="font-size:11px">🔴 AI Proctored</span>` : ''}
          </div>
          <div style="font-size:13px;color:#6b7280;margin-top:2px">
            ${q.subject||''} · ${q.questions ? q.questions.length : 0} questions · Faculty: ${q.teacherName || 'Faculty'}
          </div>
          ${q.dueDate ? `<div style="font-size:12px;color:#f59e0b;margin-top:2px">📅 Due Date: ${q.dueDate}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          ${submitted ? `
            <div style="text-align:right">
              <span class="badge ${pct>=60?'badge-green':'badge-red'}" style="font-size:13px;padding:5px 10px">${sub.score}/${sub.total} (${pct}%)</span>
              <div style="font-size:11px;color:#6b7280;margin-top:2px">⏱️ ${EA.fmtTimeSeconds(sub.timeTakenSeconds)}</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="startQuiz('${q.id}')">Retake Test →</button>
          ` : `
            <button class="btn btn-indigo" onclick="startQuiz('${q.id}')">🚀 Take Quiz →</button>
          `}
        </div>
      </div>`;
  }).join('');
}

let activeQuiz = null;
let pendingQuizId = null;
let webcamStream = null;
let screenStream = null;
let violationCount = 0;
let maxViolationsAllowed = 3;
let proctorTimerInterval = null;
let isProctoringActive = false;

function startQuiz(quizId) {
  const quiz = EA.getQuizzes().find(q => q.id === quizId);
  if (!quiz) return;

  if (quiz.proctored !== false) {
    pendingQuizId = quizId;
    document.getElementById('proctor-permission-modal').classList.remove('hidden');
  } else {
    launchQuizUI(quiz);
  }
}

function cancelProctorSetup() {
  pendingQuizId = null;
  document.getElementById('proctor-permission-modal').classList.add('hidden');
}

async function grantProctorPermissions() {
  document.getElementById('proctor-permission-modal').classList.add('hidden');
  const quizId = pendingQuizId;
  pendingQuizId = null;

  const quiz = EA.getQuizzes().find(q => q.id === quizId);
  if (!quiz) return;

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).catch(() => null);
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } }).catch(() => null);
  } catch (err) {
    console.warn("Media capture fallback:", err);
  }

  launchQuizUI(quiz, true);
}

function launchQuizUI(quiz, isProctored = false) {
  activeQuiz = quiz;
  quizStartTime = Date.now();
  violationCount = 0;
  maxViolationsAllowed = parseInt(quiz.maxViolations) || 3;

  document.getElementById('quiz-list').classList.add('hidden');
  document.getElementById('active-quiz').innerHTML = `
    <div class="card" id="quiz-container-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <div style="font-size:18px;font-weight:700">${activeQuiz.title}</div>
          <div style="font-size:13px;color:#6b7280">${activeQuiz.subject} · ${activeQuiz.questions.length} questions ${isProctored ? '· 🔴 <strong>AI Proctored Exam</strong>' : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:12px;color:#6b7280;background:#f3f4f6;padding:6px 12px;border-radius:20px" id="live-quiz-timer">⏱️ Timer Running...</span>
          <button class="btn btn-outline btn-sm" onclick="cancelQuiz()">← Exit</button>
        </div>
      </div>
      ${activeQuiz.questions.map((q,i)=>`
      <div style="margin-bottom:24px;padding-bottom:24px;${i<activeQuiz.questions.length-1?'border-bottom:1px solid #e5e7eb':''}">
        <div style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Question ${i+1} of ${activeQuiz.questions.length}</div>
        <div style="font-size:15px;font-weight:500;margin-bottom:14px;user-select:none">${q.q}</div>
        ${q.opts.map((opt,j)=>`
        <label class="option" style="display:block;margin-bottom:8px;cursor:pointer;padding:10px 14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;user-select:none">
          <input type="radio" name="aq${i}" value="${j}" style="margin-right:8px;accent-color:#6366f1"> ${opt}
        </label>`).join('')}
      </div>`).join('')}
      <button class="btn btn-indigo btn-full" onclick="submitActiveQuiz()">Submit Quiz & Save Time</button>
      <div id="quiz-feedback" style="margin-top:16px"></div>
    </div>`;

  if (isProctored) {
    setupProctoringHUD();
    attachAntiMalpracticeListeners();
  }
}

function setupProctoringHUD() {
  isProctoringActive = true;

  let hud = document.getElementById('proctor-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'proctor-hud';
    hud.className = 'proctor-hud';
    document.body.appendChild(hud);
  }

  hud.innerHTML = `
    <div class="proctor-header">
      <div class="proctor-title">
        <span class="live-indicator"></span> AI PROCTOR MONITOR
      </div>
      <span style="font-size:11px;color:#a5f3fc;font-weight:700" id="hud-timer">⏱️ 00:00</span>
    </div>
    <div class="proctor-video-grid">
      <div class="proctor-video-card">
        <video id="proctor-webcam-video" autoplay playsinline muted></video>
        <div class="proctor-video-label">📷 Student Camera</div>
      </div>
      <div class="proctor-video-card">
        <video id="proctor-screen-video" autoplay playsinline muted></video>
        <div class="proctor-video-label">🖥️ Shared Screen</div>
      </div>
    </div>
    <div class="proctor-stats">
      <div class="proctor-row">
        <span style="color:#cbd5e1">Malpractice Status:</span>
        <span class="violation-badge-counter violation-safe" id="proctor-status-pill">MONITORING SAFE</span>
      </div>
      <div class="proctor-row">
        <span style="color:#cbd5e1">Violations / Max:</span>
        <strong id="proctor-violation-count" style="color:#6ee7b7">0 / ${maxViolationsAllowed}</strong>
      </div>
    </div>`;

  const camVideo = document.getElementById('proctor-webcam-video');
  const screenVideo = document.getElementById('proctor-screen-video');

  if (webcamStream && camVideo) {
    camVideo.srcObject = webcamStream;
  } else if (camVideo) {
    camVideo.poster = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%2364748b'><text x='15' y='55' font-size='30'>📷</text></svg>";
  }

  if (screenStream && screenVideo) {
    screenVideo.srcObject = screenStream;
  } else if (screenVideo) {
    screenVideo.poster = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%2364748b'><text x='15' y='55' font-size='30'>🖥️</text></svg>";
  }

  proctorTimerInterval = setInterval(() => {
    if (!quizStartTime) return;
    const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    const timerEl = document.getElementById('hud-timer');
    if (timerEl) timerEl.textContent = `⏱️ ${m}:${s}`;
  }, 1000);
}

function attachAntiMalpracticeListeners() {
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('copy', preventMalpracticeAction);
  document.addEventListener('paste', preventMalpracticeAction);
  document.addEventListener('contextmenu', preventMalpracticeAction);
}

function removeAntiMalpracticeListeners() {
  window.removeEventListener('blur', handleWindowBlur);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.removeEventListener('copy', preventMalpracticeAction);
  document.removeEventListener('paste', preventMalpracticeAction);
  document.removeEventListener('contextmenu', preventMalpracticeAction);
}

function handleWindowBlur() {
  if (!isProctoringActive) return;
  triggerMalpracticeWarning("Window focus lost / switched to external app or tab!");
}

function handleVisibilityChange() {
  if (!isProctoringActive) return;
  if (document.hidden) {
    triggerMalpracticeWarning("Tab switched / Navigation away from quiz!");
  }
}

function preventMalpracticeAction(e) {
  if (!isProctoringActive) return;
  e.preventDefault();
  triggerMalpracticeWarning(`Unauthorized clipboard action (${e.type}) intercepted!`);
}

function triggerMalpracticeWarning(reason) {
  if (!isProctoringActive) return;
  violationCount++;

  const statusPill = document.getElementById('proctor-status-pill');
  const countEl = document.getElementById('proctor-violation-count');

  if (countEl) {
    countEl.textContent = `${violationCount} / ${maxViolationsAllowed}`;
    countEl.style.color = violationCount >= maxViolationsAllowed ? '#fca5a5' : '#fde68a';
  }

  if (statusPill) {
    statusPill.className = `violation-badge-counter ${violationCount >= maxViolationsAllowed ? 'violation-danger' : 'violation-warn'}`;
    statusPill.textContent = violationCount >= maxViolationsAllowed ? 'LIMIT EXCEEDED' : 'WARNING TRIGGERED';
  }

  // Display Toast
  let toast = document.getElementById('proctor-alert-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'proctor-alert-toast';
    toast.className = 'proctor-alert-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `⚠️ <strong>MALPRACTICE ALERT (${violationCount}/${maxViolationsAllowed}):</strong> ${reason}`;
  toast.style.display = 'flex';

  setTimeout(() => {
    if (toast) toast.style.display = 'none';
  }, 4000);

  if (violationCount >= maxViolationsAllowed) {
    setTimeout(() => {
      alert(`⚠️ MALPRACTICE VIOLATION LIMIT EXCEEDED!\n\nYou have exceeded the maximum allowed violations (${maxViolationsAllowed}). Your quiz is being auto-submitted immediately.`);
      submitActiveQuiz(true, 'Violation Threshold Exceeded');
    }, 400);
  }
}

function stopProctoring() {
  isProctoringActive = false;
  removeAntiMalpracticeListeners();
  if (proctorTimerInterval) clearInterval(proctorTimerInterval);

  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }
  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
  }

  const hud = document.getElementById('proctor-hud');
  if (hud) hud.remove();

  const toast = document.getElementById('proctor-alert-toast');
  if (toast) toast.remove();
}

function cancelQuiz() {
  stopProctoring();
  activeQuiz = null;
  quizStartTime = null;
  document.getElementById('quiz-list').classList.remove('hidden');
  document.getElementById('active-quiz').innerHTML = '';
}

function submitActiveQuiz(isAutoSubmit = false, autoReason = '') {
  if (!activeQuiz) return;
  const timeTakenSeconds = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;

  let correct = 0;
  const answers = {};
  activeQuiz.questions.forEach((q, i) => {
    const sel = document.querySelector(`input[name="aq${i}"]:checked`);
    const chosen = sel ? parseInt(sel.value) : -1;
    answers[i] = chosen;
    if (chosen === parseInt(q.ans)) correct++;
  });

  const total = activeQuiz.questions.length;
  const pct = Math.round(correct/total*100);

  EA.submitQuiz({
    quizId: activeQuiz.id,
    studentId: session.id,
    score: correct,
    total,
    timeTakenSeconds,
    answers,
    autoSubmitted: isAutoSubmit,
    autoReason: autoReason || (isAutoSubmit ? 'Malpractice Violation Threshold Exceeded' : '')
  });

  stopProctoring();

  // Show per-question feedback
  const feedback = activeQuiz.questions.map((q,i) => {
    const chosen = answers[i];
    const correct_ans = parseInt(q.ans);
    const isCorrect = chosen === correct_ans;
    return `
      <div style="padding:12px;border-radius:8px;margin-bottom:8px;background:${isCorrect?'#ecfdf5':'#fef2f2'};border:1px solid ${isCorrect?'#a7f3d0':'#fecaca'}">
        <div style="font-size:13px;font-weight:600;color:${isCorrect?'#065f46':'#991b1b'}">${isCorrect?'✓':'✗'} Question ${i+1}: ${q.q}</div>
        <div style="font-size:12px;margin-top:4px;color:#374151">Selected Option: <strong>${chosen>=0?q.opts[chosen]:'Not answered'}</strong></div>
        ${!isCorrect?`<div style="font-size:12px;color:#059669;margin-top:2px">Correct Option: <strong>${q.opts[correct_ans]}</strong></div>`:''}
      </div>`;
  }).join('');

  document.getElementById('quiz-feedback').innerHTML = `
    ${isAutoSubmit ? `
    <div style="padding:16px;background:#7f1d1d;color:#fff;border-radius:10px;margin-bottom:16px;font-weight:700">
      🚨 AUTO-SUBMITTED BY AI PROCTOR: ${autoReason || 'Malpractice Limit Exceeded'}
    </div>` : ''}
    <div style="padding:20px;background:${pct>=60?'#ecfdf5':'#fef2f2'};border:1px solid ${pct>=60?'#a7f3d0':'#fecaca'};border-radius:10px;margin-bottom:16px">
      <h3 style="font-size:18px;font-weight:700;color:${pct>=60?'#065f46':'#991b1b'}">${pct>=60?'✅ Quiz Submitted Successfully!':'❌ Need Review'} Score: ${correct}/${total} (${pct}%)</h3>
      <p style="font-size:13px;margin-top:4px;color:#374151">⏱️ Completion Time: <strong>${EA.fmtTimeSeconds(timeTakenSeconds)}</strong></p>
    </div>
    <div class="section-label">Detailed Answers</div>
    ${feedback}
    <button class="btn btn-outline" style="margin-top:12px;width:100%" onclick="cancelQuiz();renderQuizList()">← Return to Quiz Roster</button>`;

  const subBtn = document.querySelector('#active-quiz .btn-indigo.btn-full');
  if (subBtn) subBtn.style.display = 'none';
}

// ── GAP ANALYZER ───────────────────────────────────
function buildSliders() {
  const el = document.getElementById('perf-sliders');
  if (!el) return;
  el.innerHTML = Object.entries(CONCEPTS).map(([k,meta])=>`
    <div class="slider-item">
      <label>${meta.label} <span id="sv-${k}">${Math.round(meta.default*100)}%</span></label>
      <input type="range" min="0" max="100" value="${meta.default*100}"
        oninput="perfValues['${k}']=this.value/100;document.getElementById('sv-${k}').textContent=this.value+'%'">
    </div>`).join('');
}

function runAnalysis() {
  const d = localDiagnosis();
  lastDiagnosis = d;
  document.getElementById('diag-status').textContent = 'Complete';
  document.getElementById('diag-status').className = 'badge badge-green';

  const fmt = k => CONCEPTS[k]?.label || k;
  const pct = n => (n*100).toFixed(0)+'%';

  document.getElementById('diag-output').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
      <div style="background:#f8f9fc;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Overall Mastery</div>
        <div style="font-size:26px;font-weight:700;color:#6366f1">${pct(d.mastery)}</div>
      </div>
      <div style="background:#f8f9fc;border-radius:8px;padding:14px;text-align:center">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Learning Style</div>
        <div style="font-size:16px;font-weight:700;color:#059669">Visual / Conceptual</div>
      </div>
    </div>
    <div style="margin-bottom:16px">
      <div class="section-label">Root Gaps Diagnosed</div>
      ${d.rootGaps.length
        ? d.rootGaps.map(g=>`
          <div style="padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:8px">
            <strong style="color:#b91c1c">${fmt(g.concept)}</strong>
            <p style="font-size:13px;color:#374151;margin-top:2px">${g.reason}</p>
          </div>`).join('')
        : '<p class="text-muted">No critical root gaps found!</p>'}
    </div>
    <div>
      <div class="section-label">Recommended Interventions</div>
      ${d.actions.map(a=>`
      <div style="padding:10px 12px;background:#f8f9fc;border-radius:8px;margin-bottom:8px;font-size:13px;border-left:3px solid #6366f1">
        <strong>${a.title}</strong><br>
        <span style="color:#6b7280">${a.detail}</span>
      </div>`).join('')}
    </div>`;

  renderOverview();
}

function localDiagnosis() {
  const prereqs = { optimization:['partial_derivatives','derivatives'], partial_derivatives:['derivatives'] };
  const rootGaps = [];
  Object.keys(CONCEPTS).forEach(k => {
    if (perfValues[k] < 0.6) {
      const blockers = (prereqs[k]||[]).filter(p=>(perfValues[p]||0)<0.7);
      if (blockers.length) {
        blockers.forEach(b => rootGaps.push({ concept:b, reason:`"${CONCEPTS[b].label}" is a prerequisite of "${CONCEPTS[k].label}" and needs strengthening.` }));
      } else {
        rootGaps.push({ concept:k, reason:`Direct weakness in "${CONCEPTS[k].label}".` });
      }
    }
  });
  const weak = Object.keys(CONCEPTS).filter(k=>perfValues[k]<0.6);
  const actions = weak.slice(0,3).map(k=>({ title:`Study: ${CONCEPTS[k].label}`, detail:`Review foundational topics with interactive visualization modules.` }));
  const scores = Object.values(perfValues);
  return { mastery: scores.reduce((a,b)=>a+b,0)/scores.length, rootGaps, actions };
}

// ── PROFILE ────────────────────────────────────────
function renderProfile() {
  const s = session;
  const links = [
    s.linkedin && `<a href="https://${s.linkedin.replace('https://','')}" target="_blank" class="profile-link">LinkedIn</a>`,
    s.github && `<a href="https://${s.github.replace('https://','')}" target="_blank" class="profile-link">GitHub</a>`,
    s.leetcode && `<a href="https://${s.leetcode.replace('https://','')}" target="_blank" class="profile-link">LeetCode</a>`,
    s.hackerrank && `<a href="https://${s.hackerrank.replace('https://','')}" target="_blank" class="profile-link">HackerRank</a>`,
  ].filter(Boolean).join(' ');

  document.getElementById('profile-content').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <!-- Header -->
      <div class="card" style="display:flex;align-items:center;gap:20px;padding:28px">
        <div style="width:64px;height:64px;background:#6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0">${EA.avatar(s.name)}</div>
        <div>
          <div style="font-size:22px;font-weight:700">${s.name}</div>
          <div style="color:#6b7280;font-size:14px;margin-top:2px">${s.prn||'No PRN'} · ${s.year||'?'}-${s.division||'?'} · ${s.department||''}</div>
          ${links ? `<div style="margin-top:10px">${links}</div>` : ''}
        </div>
      </div>

      <div class="grid-2">
        <!-- Personal -->
        <div class="card">
          <div class="card-title">👤 Personal Contact Details</div>
          ${[['Email',s.email],['Phone',s.phone||'—'],['Address',s.address||'—']].map(([l,v])=>`
          <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;display:flex;gap:12px">
            <span style="color:#6b7280;width:90px;flex-shrink:0">${l}</span>
            <strong>${v}</strong>
          </div>`).join('')}
        </div>

        <!-- Parent -->
        <div class="card">
          <div class="card-title">👨‍👩‍👧 Parent / Guardian Details</div>
          ${[['Parent Name',s.parentName||'—'],['Phone',s.parentPhone||'—'],['Email',s.parentEmail||'—']].map(([l,v])=>`
          <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;display:flex;gap:12px">
            <span style="color:#6b7280;width:90px;flex-shrink:0">${l}</span>
            <strong>${v}</strong>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
}
