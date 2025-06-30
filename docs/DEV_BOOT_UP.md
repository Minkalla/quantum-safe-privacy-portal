Developer Bootup Guide

Objective: Provide a streamlined guide for new developers to set up their local environment and start contributing to the Minkalla Quantum-Safe Privacy Portal.

Prerequisites:

Operating System: Windows 10/11, macOS, or Linux

Tools: Git, Node.js (v22.16.0), Docker Desktop (v28.1.1), MongoDB Atlas account

Access: Repository permissions, AWS credentials

Setup Steps:

Clone the Repository:

git clone https://github.com/minkalla/quantum-safe-privacy-portal.git
cd quantum-safe-privacy-portal

Install Dependencies:

pnpm install

Configure Environment Variables:

Copy .env.example to .env and update values as needed.

Start Docker Services:

docker-compose up -d

Run Tests:

pnpm test

Access the Application:

Frontend: http://localhost:3000

Backend: http://localhost:8080

Troubleshooting:

Check Docker logs for errors:

docker-compose logs

Verify environment variable configuration.

Consult docs/DEBUGGING.md for common issues.

Next Steps:

Review docs/ for project-specific guidelines.

Join the team Slack channel for support.