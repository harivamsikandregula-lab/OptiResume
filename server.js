require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize HuggingFace
const HF_TOKEN = process.env.HF_TOKEN;
if (!HF_TOKEN) {
  console.error('\n❌  HF_TOKEN is missing or not set in .env file!\n');
} else {
  console.log(`✅  HF token loaded: ${HF_TOKEN.slice(0, 8)}...`);
}

async function fetchHF(prompt) {
  const url = 'https://router.huggingface.co/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HF API error: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ── Quick connection test on startup ──────────────────────────
async function testHFConnection() {
  try {
    await fetchHF('Say OK. Just respond with OK and nothing else.');
    console.log('✅  Hugging Face API connection: OK\n');
  } catch (err) {
    console.error(`❌  Hugging Face API connection FAILED: ${err.message}`);
  }
}
testHFConnection();

// Jake's Resume LaTeX Template
const JAKES_TEMPLATE = `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%%% BEGIN DOCUMENT %%%
\\begin{document}

%%RESUME_CONTENT%%

\\end{document}`;

// ============================================================
// API ROUTES
// ============================================================

/**
 * POST /api/tailor
 * Main endpoint: analyzes resume, tailors it to the job, returns structured data
 */
app.post('/api/tailor', async (req, res) => {
  try {
    const { resumeText, jobTitle, jobDescription } = req.body;

    if (!resumeText || !jobTitle || !jobDescription) {
      return res.status(400).json({ error: 'Missing required fields: resumeText, jobTitle, jobDescription' });
    }

    const prompt = `You are an elite Tech Resume Writer and ATS Optimization Expert. Analyze the provided resume and tailor it specifically for the target job role to maximize ATS score and recruiter impact.

TARGET ROLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${resumeText}

INSTRUCTIONS FOR ATS OPTIMIZATION:
1. ACTION VERBS: Start every bullet with a strong action verb (e.g., Architected, Optimized, Spearheaded).
2. METRICS & STAR METHOD: Quantify achievements using the XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]".
3. KEYWORDS: Seamlessly weave keywords from the job description into the professional summary and experience bullets.
4. RELEVANCE: Highlight experiences that directly match the job description. Do not invent information; if missing, use an empty string.
5. CONCISENESS: Keep bullet points to 1 line, absolutely maximizing impact per word.

Return ONLY the following structured JSON format. Provide NO markdown wrappers, NO greetings, NO chat. ONLY valid raw JSON:

{
  "atsScore": <number 0-100 representing how well the current resume matches the job>,
  "enhancedScore": <number 0-100 representing the projected score after improvements>,
  "keywordAnalysis": {
    "matched": [<list of keywords from job description found in resume>],
    "missing": [<list of important keywords from job description NOT in resume>],
    "suggested": [<list of additional industry keywords to add>]
  },
  "skillsGap": {
    "existing": [<skills already in resume that match>],
    "toAdd": [<skills to add based on job description>],
    "toHighlight": [<existing skills that should be more prominent>]
  },
  "improvements": [
    {
      "section": "<section name>",
      "original": "<original text>",
      "improved": "<improved text>",
      "reason": "<why this change helps>"
    }
  ],
  "tips": [<list of 5-7 actionable tips for this specific application>],
  "tailoredResume": {
    "name": "<full name>",
    "phone": "<phone number or empty string>",
    "email": "<email or empty string>",
    "linkedin": "<linkedin URL or empty string>",
    "github": "<github URL or empty string>",
    "portfolio": "<portfolio URL or empty string>",
    "summary": "<2-3 line professional summary tailored to the role, or empty string if not appropriate>",
    "education": [
      {
        "institution": "<university/school name>",
        "location": "<city, state>",
        "degree": "<degree name>",
        "dates": "<date range>",
        "gpa": "<GPA if mentioned, else empty>",
        "coursework": "<relevant coursework, comma separated, or empty>"
      }
    ],
    "experience": [
      {
        "company": "<company name>",
        "location": "<city, state>",
        "title": "<job title>",
        "dates": "<date range>",
        "bullets": [
          "<achievement-oriented bullet point using strong action verbs and metrics>"
        ]
      }
    ],
    "projects": [
      {
        "name": "<project name>",
        "technologies": "<tech stack used>",
        "dates": "<date range or empty>",
        "bullets": [
          "<project description bullet points>"
        ]
      }
    ],
    "skills": {
      "categories": [
        {
          "name": "<category like Languages, Frameworks, Tools, etc.>",
          "items": "<comma separated list of skills>"
        }
      ]
    },
    "certifications": [
      {
        "name": "<certification name>",
        "issuer": "<issuing organization>",
        "date": "<date or empty>"
      }
    ]
  }
}

IMPORTANT JSON GUIDELINES:
- Ensure all arrays only contain strings (e.g., "bullets" must be an array of strings, NOT arrays).
- Ensure ATS-friendly formatting and maintain the exact schema keys requested.
- Prioritize the exact technologies/tools mentioned in the job description.`;

    const responseText = await fetchHF(prompt);

    // Parse JSON from response
    let parsed;
    try {
      // Try to extract JSON from possible markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        // Find the first { and last } to extract JSON
        const start = responseText.indexOf('{');
        const end = responseText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          parsed = JSON.parse(responseText.slice(start, end + 1));
        } else {
          parsed = JSON.parse(responseText.trim());
        }
      }
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      console.error('Raw response:', responseText.substring(0, 500));
      return res.status(500).json({ error: 'Failed to parse AI response. Please try again.' });
    }

    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Tailor error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/generate-latex
 * Converts the tailored resume JSON into LaTeX using Jake's template
 */
app.post('/api/generate-latex', async (req, res) => {
  try {
    const { tailoredResume } = req.body;

    if (!tailoredResume) {
      return res.status(400).json({ error: 'Missing tailoredResume data' });
    }

    const r = tailoredResume;
    let content = '';

    // --- HEADER ---
    const headerParts = [];
    if (r.phone) headerParts.push(`\\small ${escapeLatex(r.phone)}`);
    if (r.email) headerParts.push(`\\href{mailto:${escapeLatex(r.email)}}{\\underline{${escapeLatex(r.email)}}}`);
    if (r.linkedin) {
      const linkedinDisplay = String(r.linkedin).replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      headerParts.push(`\\href{${escapeLatex(String(r.linkedin))}}{\\underline{${escapeLatex(linkedinDisplay)}}}`);
    }
    if (r.github) {
      const githubDisplay = String(r.github).replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      headerParts.push(`\\href{${escapeLatex(String(r.github))}}{\\underline{${escapeLatex(githubDisplay)}}}`);
    }
    if (r.portfolio) {
      const portfolioDisplay = String(r.portfolio).replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      headerParts.push(`\\href{${escapeLatex(String(r.portfolio))}}{\\underline{${escapeLatex(portfolioDisplay)}}}`);
    }

    content += `\\begin{center}
    \\textbf{\\Huge \\scshape ${escapeLatex(r.name || 'Your Name')}} \\\\ \\vspace{1pt}
    ${headerParts.join(' $|$ \n    ')}
\\end{center}\n\n`;

    // --- SUMMARY (if provided) ---
    if (r.summary && String(r.summary).trim()) {
      content += `\\section{Summary}
  ${escapeLatex(r.summary)}\n\n`;
    }

    // --- EDUCATION ---
    if (r.education && r.education.length > 0) {
      content += `\\section{Education}
  \\resumeSubHeadingListStart\n`;
      for (const edu of r.education) {
        content += `    \\resumeSubheading
      {${escapeLatex(edu.institution || '')}}{${escapeLatex(edu.location || '')}}
      {${escapeLatex(edu.degree || '')}}{${escapeLatex(edu.dates || '')}}\n`;
        if (edu.gpa || edu.coursework) {
          content += `      \\resumeItemListStart\n`;
          if (edu.gpa) content += `        \\resumeItem{GPA: ${escapeLatex(edu.gpa)}}\n`;
          if (edu.coursework) content += `        \\resumeItem{Relevant Coursework: ${escapeLatex(edu.coursework)}}\n`;
          content += `      \\resumeItemListEnd\n`;
        }
      }
      content += `  \\resumeSubHeadingListEnd\n\n`;
    }

    // --- EXPERIENCE ---
    if (r.experience && r.experience.length > 0) {
      content += `\\section{Experience}
  \\resumeSubHeadingListStart\n`;
      for (const exp of r.experience) {
        content += `    \\resumeSubheading
      {${escapeLatex(exp.title || '')}}{${escapeLatex(exp.dates || '')}}
      {${escapeLatex(exp.company || '')}}{${escapeLatex(exp.location || '')}}\n`;
        if (exp.bullets && exp.bullets.length > 0) {
          content += `      \\resumeItemListStart\n`;
          for (const bullet of exp.bullets) {
            content += `        \\resumeItem{${escapeLatex(bullet)}}\n`;
          }
          content += `      \\resumeItemListEnd\n`;
        }
        content += '\n';
      }
      content += `  \\resumeSubHeadingListEnd\n\n`;
    }

    // --- PROJECTS ---
    if (r.projects && r.projects.length > 0) {
      content += `\\section{Projects}
  \\resumeSubHeadingListStart\n`;
      for (const proj of r.projects) {
        const techStr = proj.technologies ? ` $|$ \\emph{${escapeLatex(proj.technologies)}}` : '';
        content += `    \\resumeProjectHeading
      {\\textbf{${escapeLatex(proj.name || '')}}${techStr}}{${escapeLatex(proj.dates || '')}}\n`;
        if (proj.bullets && proj.bullets.length > 0) {
          content += `      \\resumeItemListStart\n`;
          for (const bullet of proj.bullets) {
            content += `        \\resumeItem{${escapeLatex(bullet)}}\n`;
          }
          content += `      \\resumeItemListEnd\n`;
        }
        content += '\n';
      }
      content += `  \\resumeSubHeadingListEnd\n\n`;
    }

    // --- SKILLS ---
    if (r.skills && r.skills.categories && r.skills.categories.length > 0) {
      content += `\\section{Technical Skills}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{\n`;
      const skillLines = r.skills.categories.map(cat =>
        `     \\textbf{${escapeLatex(cat.name || '')}}{: ${escapeLatex(cat.items || '')}} \\\\`
      );
      content += skillLines.join('\n') + '\n';
      content += `    }}
  \\end{itemize}\n\n`;
    }

    // --- CERTIFICATIONS ---
    if (r.certifications && r.certifications.length > 0) {
      content += `\\section{Certifications}
  \\resumeSubHeadingListStart\n`;
      for (const cert of r.certifications) {
        content += `    \\resumeProjectHeading
      {\\textbf{${escapeLatex(cert.name || '')}} -- ${escapeLatex(cert.issuer || '')}}{${escapeLatex(cert.date || '')}}\n`;
      }
      content += `  \\resumeSubHeadingListEnd\n\n`;
    }

    // Build final LaTeX document
    const fullLatex = JAKES_TEMPLATE.replace('%%RESUME_CONTENT%%', content);

    res.json({ success: true, latex: fullLatex });
  } catch (error) {
    console.error('Generate LaTeX error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate LaTeX' });
  }
});

/**
 * POST /api/cover-letter
 * Generates a tailored cover letter
 */
app.post('/api/cover-letter', async (req, res) => {
  try {
    const { resumeText, jobTitle, jobDescription, companyName } = req.body;

    if (!resumeText || !jobTitle || !jobDescription) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const prompt = `You are an expert career coach. Write a compelling, professional cover letter for the following job application.

TARGET ROLE: ${jobTitle}
COMPANY: ${companyName || '[Company Name]'}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resumeText}

Write a professional cover letter that:
1. Opens with a strong, specific hook mentioning the role and company
2. Highlights 2-3 most relevant experiences/achievements from the resume
3. Connects the candidate's skills directly to the job requirements
4. Shows enthusiasm and cultural fit
5. Closes with a clear call to action
6. Is 3-4 paragraphs, approximately 300-350 words
7. Uses professional but engaging tone

Return ONLY the cover letter text, no extra commentary. Do NOT include placeholders for addresses or dates - just the letter body starting with "Dear Hiring Manager," or similar.`;

    const coverLetter = await fetchHF(prompt);

    res.json({ success: true, coverLetter });
  } catch (error) {
    console.error('Cover letter error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate cover letter' });
  }
});

/**
 * Utility: Escape special LaTeX characters
 */
function escapeLatex(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// Serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 OptiRes server running at http://localhost:${PORT}\n`);
});
