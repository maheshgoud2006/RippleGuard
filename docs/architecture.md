# RippleGuard Architecture

## Architecture style
A modular monolith: React single-page application, FastAPI REST API, graph analysis logic, and SQLAlchemy persistence layer.

## Layers
1. Presentation: forms, project dashboard, dependency graph, impact report, history.
2. API: FastAPI routes and Pydantic validation.
3. Domain logic: reverse dependency traversal, test recommendations, risk scoring.
4. Persistence: SQLAlchemy models using SQLite by default; PostgreSQL can be configured through DATABASE_URL.

## Dependency direction
An edge `A -> B` means A depends on B. Changing B may affect A, so the algorithm traverses reverse edges from B.

## Algorithm
Breadth-first search visits reachable modules once: O(V + E) time and O(V + E) graph storage.

## Risk heuristic
Score combines change type, affected-module count, module complexity, and missing test coverage, capped at 100. Low < 30, Medium < 60, otherwise High. It is a prioritization heuristic, not a calibrated defect probability.

## Local services
- Frontend: http://localhost:5173
- Backend: http://127.0.0.1:8000
- API docs: http://127.0.0.1:8000/docs

## Future improvements
Python AST analysis, Git diff integration, authentication/authorization, PDF/CSV export, and deployment hardening.
