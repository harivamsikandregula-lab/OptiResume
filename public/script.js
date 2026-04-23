/* ================================================
   OptiRes — Frontend JavaScript
   ================================================ */

'use strict';

// ─── State ───────────────────────────────────────
const state = {
  tailoredData: null,
  latexSource: null,
  coverLetter: null,
  jobTitle: '',
  companyName: '',
};

// ─── DOM References ───────────────────────────────
const $ = (id) => document.getElementById(id);

const navbar        = $('navbar');
const form          = $('resume-form');
const submitBtn     = $('submit-btn');
const paneInput     = $('pane-input');
const paneLoading   = $('pane-loading');
const paneResults   = $('pane-results');
const toast         = $('toast');

const siStep1 = $('si-step-1');
const siStep2 = $('si-step-2');
const siStep3 = $('si-step-3');
const siLine1 = $('si-line-1');
const siLine2 = $('si-line-2');

const lsSteps = [null, $('ls-1'), $('ls-2'), $('ls-3'), $('ls-4'), $('ls-5')];

const arcOriginal   = $('arc-original');
const arcEnhanced   = $('arc-enhanced');
const numOriginal   = $('num-original');
const numEnhanced   = $('num-enhanced');

// ─── Navbar scroll ────────────────────────────────
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ─── Char counters ────────────────────────────────
function setupCharCounter(textareaId, counterId) {
  const ta = $(textareaId);
  const ct = $(counterId);
  if (!ta || !ct) return;
  ta.addEventListener('input', () => {
    const n = ta.value.length;
    ct.textContent = `${n.toLocaleString()} character${n !== 1 ? 's' : ''}`;
  });
}
setupCharCounter('job-description', 'jd-char-count');
setupCharCounter('resume-text', 'resume-char-count');

// ─── Toast ────────────────────────────────────────
let toastTimer;
function showToast(msg, duration = 3000) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ─── Step Indicator ──────────────────────────────
function setStep(step) {
  [siStep1, siStep2, siStep3].forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 < step) el.classList.add('done');
    else if (i + 1 === step) el.classList.add('active');
  });
  siLine1.classList.toggle('active', step >= 2);
  siLine2.classList.toggle('active', step >= 3);

  [$('si-step-1'), $('si-step-2'), $('si-step-3')].forEach((el, i) => {
    const numEl = el.querySelector('.si-num');
    if (i + 1 < step) numEl.textContent = '✓';
    else numEl.textContent = String(i + 1);
  });
}

// ─── Show/Hide Panes ─────────────────────────────
function showPane(pane) {
  [paneInput, paneLoading, paneResults].forEach(p => p.classList.add('hidden'));
  pane.classList.remove('hidden');
}

// ─── Loading Step Animator ───────────────────────
let loadingStepIndex = 1;
let loadingStepTimer;

function startLoadingAnimation() {
  loadingStepIndex = 1;
  lsSteps.slice(1).forEach(s => {
    s.classList.remove('active', 'done');
    const icon = s.querySelector('.ls-icon');
    if (icon) icon.textContent = '⏳';
  });
  lsSteps[1].classList.add('active');

  loadingStepTimer = setInterval(() => {
    if (loadingStepIndex <= 5) {
      lsSteps[loadingStepIndex].classList.remove('active');
      lsSteps[loadingStepIndex].classList.add('done');
      const icon = lsSteps[loadingStepIndex].querySelector('.ls-icon');
      if (icon) icon.textContent = '✅';
    }
    loadingStepIndex++;
    if (loadingStepIndex <= 5) {
      lsSteps[loadingStepIndex].classList.add('active');
    } else {
      clearInterval(loadingStepTimer);
    }
  }, 2200);
}

function stopLoadingAnimation() {
  clearInterval(loadingStepTimer);
}

// ─── ATS Score Circle Animator ───────────────────
function animateScore(arcEl, numEl, targetScore, delay = 0) {
  const circumference = 201;
  setTimeout(() => {
    const dasharray = (targetScore / 100) * circumference;
    arcEl.setAttribute('stroke-dasharray', `${dasharray} ${circumference}`);
    let current = 0;
    const step = targetScore / 40;
    const interval = setInterval(() => {
      current = Math.min(current + step, targetScore);
      numEl.textContent = `${Math.round(current)}%`;
      if (current >= targetScore) clearInterval(interval);
    }, 30);
  }, delay);
}

// ─── Render Analysis Tab ─────────────────────────
function renderAnalysis(data) {
  renderTags($('kw-matched'),      data.keywordAnalysis?.matched   || [], 'kw-tag matched');
  renderTags($('kw-missing'),      data.keywordAnalysis?.missing   || [], 'kw-tag missing');
  renderTags($('kw-suggested'),    data.keywordAnalysis?.suggested || [], 'kw-tag suggested');
  renderTags($('skills-highlight'),data.skillsGap?.toHighlight     || [], 'skill-tag highlight');
  renderTags($('skills-add'),      data.skillsGap?.toAdd           || [], 'skill-tag add');

  const impList = $('improvements-list');
  impList.innerHTML = '';
  const improvements = data.improvements || [];
  if (improvements.length === 0) {
    impList.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;">No major improvements listed — your resume was already well-matched!</p>';
  } else {
    improvements.slice(0, 6).forEach(imp => {
      const el = document.createElement('div');
      el.className = 'improvement-item';
      el.innerHTML = `
        <span class="imp-section-tag">${escapeHtml(imp.section || 'General')}</span>
        <div class="imp-before-after">
          <div class="imp-box before">
            <span class="imp-box-label">Before</span>
            ${escapeHtml(imp.original || '—')}
          </div>
          <div class="imp-box after">
            <span class="imp-box-label">After ✨</span>
            ${escapeHtml(imp.improved || '—')}
          </div>
        </div>
        <div class="imp-reason">💡 ${escapeHtml(imp.reason || '')}</div>
      `;
      impList.appendChild(el);
    });
  }

  const tipsList = $('tips-list');
  tipsList.innerHTML = '';
  const tips = data.tips || [];
  if (tips.length === 0) {
    tipsList.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;">No specific tips available.</p>';
  } else {
    tips.forEach((tip, i) => {
      const el = document.createElement('div');
      el.className = 'tip-item';
      el.innerHTML = `<span class="tip-num">${i + 1}</span><span>${escapeHtml(tip)}</span>`;
      tipsList.appendChild(el);
    });
  }
}

function renderTags(container, items, className) {
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem;">None identified</span>';
    return;
  }
  items.forEach(item => {
    const tag = document.createElement('span');
    tag.className = className;
    tag.textContent = String(item);
    container.appendChild(tag);
  });
}

// ─── Build Overleaf URL ────────────────────────────
function buildOverleafUrl(latex) {
  const encoded = encodeURIComponent(latex);
  return `https://www.overleaf.com/docs?snip=${encoded}`;
}

// ─── Populate Results ────────────────────────────
function populateResults(data, latex) {
  const ats = data.atsScore || 0;
  const enhanced = data.enhancedScore || 0;
  animateScore(arcOriginal, numOriginal, ats, 200);
  animateScore(arcEnhanced, numEnhanced, enhanced, 600);

  renderAnalysis(data);

  $('dl-job-title').textContent = state.jobTitle;

  const overleafUrl = buildOverleafUrl(latex);
  $('btn-overleaf').href = overleafUrl;
  $('btn-overleaf-2').href = overleafUrl;

  $('latex-code-display').textContent = latex;
}

// ─── Tabs ────────────────────────────────────────
document.querySelectorAll('.rtab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.rtab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    $(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

// ─── Copy LaTeX ──────────────────────────────────
function copyLatex() {
  if (!state.latexSource) return;
  navigator.clipboard.writeText(state.latexSource)
    .then(() => showToast('✅ LaTeX code copied to clipboard!'))
    .catch(() => showToast('❌ Copy failed. Please copy manually.'));
}
$('btn-copy-latex').addEventListener('click', copyLatex);
$('btn-copy-latex-2').addEventListener('click', copyLatex);

// ─── Copy Cover Letter ───────────────────────────
$('btn-copy-cl').addEventListener('click', () => {
  const text = $('cover-letter-text').textContent;
  if (!text || text.includes('Generating')) return;
  navigator.clipboard.writeText(text)
    .then(() => showToast('✅ Cover letter copied!'))
    .catch(() => showToast('❌ Copy failed.'));
});

// ─── Regenerate Cover Letter ─────────────────────
$('btn-regen-cl').addEventListener('click', async () => {
  if (!state.tailoredData) return;
  await fetchCoverLetter(
    $('resume-text').value,
    state.jobTitle,
    $('job-description').value,
    state.companyName
  );
});

async function fetchCoverLetter(resumeText, jobTitle, jobDescription, companyName) {
  $('cover-letter-text').innerHTML = '<div class="cl-loading">Generating cover letter…</div>';
  try {
    const res = await fetch('/api/cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText, jobTitle, jobDescription, companyName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to generate cover letter');
    state.coverLetter = json.coverLetter;
    $('cover-letter-text').textContent = json.coverLetter;
  } catch (err) {
    $('cover-letter-text').innerHTML = `<div class="cl-loading" style="color:var(--accent-danger)">Error: ${escapeHtml(err.message)}</div>`;
  }
}

// ─── Start Over ───────────────────────────────────
$('btn-start-over').addEventListener('click', () => {
  state.tailoredData = null;
  state.latexSource = null;
  state.coverLetter = null;
  form.reset();

  $('jd-char-count').textContent = '0 characters';
  $('resume-char-count').textContent = '0 characters';

  lsSteps.slice(1).forEach(s => {
    s.classList.remove('active', 'done');
    const icon = s.querySelector('.ls-icon');
    if (icon) icon.textContent = '⏳';
  });

  // Reset score rings
  arcOriginal.setAttribute('stroke-dasharray', '0 201');
  arcEnhanced.setAttribute('stroke-dasharray', '0 201');
  numOriginal.textContent = '0%';
  numEnhanced.textContent = '0%';

  setStep(1);
  showPane(paneInput);
  window.scrollTo({ top: $('app-section').offsetTop - 80, behavior: 'smooth' });
});

// ─── Hero / Nav smooth scroll ─────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ─── Form Submit ─────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const resumeText     = $('resume-text').value.trim();
  const jobTitle       = $('job-title').value.trim();
  const jobDescription = $('job-description').value.trim();
  const companyName    = $('company-name').value.trim();
  const genCL          = $('gen-cover-letter').checked;

  if (!resumeText || !jobTitle || !jobDescription) {
    showToast('⚠️ Please fill in all required fields.');
    return;
  }
  if (resumeText.length < 100) {
    showToast('⚠️ Please paste your full resume text (at least 100 characters).');
    return;
  }

  state.jobTitle    = jobTitle;
  state.companyName = companyName;

  submitBtn.disabled = true;
  setStep(2);
  showPane(paneLoading);
  startLoadingAnimation();
  window.scrollTo({ top: $('app-section').offsetTop - 80, behavior: 'smooth' });

  try {
    // ── Step 1: Tailor ──
    updateLoadingUI('Analyzing your resume…', 'Llama AI is reading your resume and job description');
    const tailorRes = await fetch('/api/tailor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText, jobTitle, jobDescription }),
    });
    const tailorJson = await tailorRes.json();
    if (!tailorRes.ok) throw new Error(tailorJson.error || 'Tailoring failed');
    state.tailoredData = tailorJson.data;

    // ── Step 2: LaTeX ──
    updateLoadingUI('Generating LaTeX document…', "Building your resume with Jake's Template");
    const latexRes = await fetch('/api/generate-latex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tailoredResume: tailorJson.data.tailoredResume }),
    });
    const latexJson = await latexRes.json();
    if (!latexRes.ok) throw new Error(latexJson.error || 'LaTeX generation failed');
    state.latexSource = latexJson.latex;

    // ── Step 3: Results ──
    stopLoadingAnimation();
    populateResults(tailorJson.data, latexJson.latex);

    // ── Step 4: Cover letter ──
    if (genCL) {
      fetchCoverLetter(resumeText, jobTitle, jobDescription, companyName);
    } else {
      $('cover-letter-text').innerHTML = `
        <div class="cl-loading" style="flex-direction:column;gap:12px;">
          <span>Cover letter generation was not requested.</span>
          <button class="btn btn-sm btn-secondary" onclick="document.getElementById('btn-regen-cl').click()" style="width:fit-content;margin:0 auto;">
            Generate Now
          </button>
        </div>`;
    }

    setStep(3);
    showPane(paneResults);
    window.scrollTo({ top: $('app-section').offsetTop - 80, behavior: 'smooth' });
    showToast('✅ Resume tailored successfully!', 4000);

  } catch (err) {
    stopLoadingAnimation();
    setStep(1);
    showPane(paneInput);
    showToast(`❌ Error: ${err.message}`, 5000);
    console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
});

// ─── Helpers ─────────────────────────────────────
function updateLoadingUI(title, subtitle) {
  $('loading-title').textContent = title;
  $('loading-subtitle').textContent = subtitle;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Init ─────────────────────────────────────────
setStep(1);

// Subtle parallax on hero orbs
document.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 20;
  document.querySelectorAll('.orb').forEach((orb, i) => {
    const factor = (i + 1) * 0.4;
    orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
  });
}, { passive: true });
