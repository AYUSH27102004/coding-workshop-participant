# ACME Employee Performance and Development Management Platform

## Overview
A centralized employee performance and development management platform that enables managers and HR teams to track employee performance, manage development plans, identify skill gaps, and support career growth.

## Architecture
- **Frontend**: React, Material-UI (MUI), Vite
- **Backend**: Python, FastAPI
- **Database**: PostgreSQL

## Getting Started

### Local Setup (Backend)
1. Ensure Python 3.8+ and PostgreSQL are installed.
2. Navigate to \`backend/\`: \`cd backend\`
3. Create a virtual environment: \`python -m venv venv\`
4. Activate the virtual environment:
   - Windows: \`.\\venv\\Scripts\\activate\`
   - Mac/Linux: \`source venv/bin/activate\`
5. Install dependencies: \`pip install -r requirements.txt\`
6. Start the server: \`uvicorn app.main:app --reload\`

### Local Setup (Frontend)
1. Ensure Node.js and NPM are installed.
2. Navigate to \`frontend/\`: \`cd frontend\`
3. Install dependencies: \`npm install\`
4. Start the development server: \`npm run dev\`

### AWS Deployment (Future)
This application will eventually be deployed to AWS Serverless (S3, CloudFront, Lambda, Aurora) from Amazon Workspaces.

## Requirements Checklist
- [ ] User authentication and authorization (RBAC: HR, Manager, Employee)
- [ ] CRUD for Performance reviews
- [ ] CRUD for Development plans
- [ ] CRUD for Competencies
- [ ] CRUD for Training records
- [ ] Search and filter functionality
- [ ] Responsive design (mobile and desktop)

## Testing Checklist
- [ ] Backend Unit & Integration tests passing
- [ ] Frontend responsive and components functional
- [ ] No console errors
