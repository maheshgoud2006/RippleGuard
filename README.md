# RippleGuard

A web-based Software Change Impact Analysis and Test Recommendation Platform.

## Features
- Projects, modules, and directed dependencies
- Interactive React Flow dependency graph
- BFS-based direct/indirect impact analysis
- Explainable heuristic risk score
- Test registration, recommendations, and coverage gaps
- Persistent analysis history
- FastAPI OpenAPI documentation and unit tests

## Stack
React + Vite + React Flow; Python + FastAPI + SQLAlchemy; SQLite by default; pytest.

## Requirements
Python 3.11+, Node.js 20+ recommended, npm.

## Run on Windows

### Backend terminal
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```
If PowerShell activation is blocked, use Command Prompt and `venv\Scripts\activate.bat`.

API: http://127.0.0.1:8000  
Interactive docs: http://127.0.0.1:8000/docs

### Frontend terminal (from project root)
```bash
cd frontend
npm install
npm run dev
```
Open the localhost URL printed by Vite, usually http://localhost:5173.

## Demo
1. Create `Online Shopping System`.
2. Add modules `Authentication`, `Payment`, and `Checkout`.
3. Add dependencies with source/target:
   - Payment -> Authentication
   - Checkout -> Payment
4. Register tests for Authentication and Checkout, but not Payment.
5. Analyze a `breaking` change to Authentication.
6. Payment and Checkout should be affected; Payment should appear as a test coverage gap.

An edge `source -> target` means source depends on target. The analysis follows reverse edges to find callers affected by changing a target.

## Tests
From the backend directory: `pytest -q`

## Database configuration
Default SQLite file is created in the backend working directory. To use PostgreSQL, set `DATABASE_URL` to a valid SQLAlchemy URL and install a compatible PostgreSQL driver.

## Limitations
Dependency relationships are manually entered; source-code parsing and Git integration are future enhancements. Risk scores are heuristic priority scores, not defect probabilities. Authentication is not implemented, so this is an academic local prototype, not a secured public service.
Software Change Impact Analysis and Test Recommendation Platform
