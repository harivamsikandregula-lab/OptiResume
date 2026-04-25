# OptiResume — AI Resume Tailor

Instantly tailor your resume to any job description using AI. OptiResume uses Gemma AI to generate ATS-optimized, LaTeX-formatted resumes that stand out to recruiters.

## Features

- **AI-Powered Tailoring**: Uses Google's Gemma model to customize your resume for specific job postings
- **ATS-Optimized**: Generates resumes formatted for Applicant Tracking Systems
- **LaTeX Support**: Professional formatting with LaTeX export
- **Real-time Processing**: Fast resume generation powered by HuggingFace API
- **Simple Interface**: Clean, user-friendly web interface


## Installation

1. Clone the repository:
```bash
git clone https://github.com/harivamsikandregula-lab/OptiResume.git
cd OptiResume
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your HuggingFace token:
```
HF_TOKEN=your_huggingface_token_here
PORT=3000
```

## Usage

Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## How It Works

1. Upload your resume
2. Paste the job description
3. Click "Tailor Resume"
4. Get an AI-optimized resume ready to apply

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: HTML, CSS, JavaScript
- **AI Model**: Google's Gemma (via HuggingFace)
- **API**: HuggingFace Inference API

## Important Note

OptiResume uses HuggingFace's free-tier API with the Gemma model. While the AI generates highly optimized resumes for most job descriptions, please review the output before submitting. Occasionally (< 10% of cases), the LaTeX formatting may need minor adjustments. We recommend checking the final resume for any formatting inconsistencies to ensure it displays perfectly in your ATS.


## Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/harivamsikandregula-lab/OptiResume).
