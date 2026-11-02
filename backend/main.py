from collections import defaultdict, deque
import json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from models import Project, Module, Dependency, TestCase, ChangeAnalysis
from schemas import ProjectCreate, ProjectOut, ModuleCreate, ModuleOut, DependencyCreate, TestCreate, TestOut, AnalysisCreate

Base.metadata.create_all(bind=engine)
app = FastAPI(title="RippleGuard API", version="1.0.0", description="Software change impact analysis")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def home():
    return {"name": "RippleGuard API", "status": "ready", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    name = data.name.strip()
    if not name:
        raise HTTPException(422, "Project name cannot be blank")
    obj = Project(name=name, description=data.description.strip())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Project name already exists")
    return obj

@app.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.id.desc()).all()

@app.post("/modules", response_model=ModuleOut, status_code=201)
def create_module(data: ModuleCreate, db: Session = Depends(get_db)):
    if not db.get(Project, data.project_id):
        raise HTTPException(404, "Project not found")
    if not data.name.strip():
        raise HTTPException(422, "Module name cannot be blank")
    obj = Module(project_id=data.project_id, name=data.name.strip(), description=data.description.strip(), complexity=data.complexity)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Module name already exists in this project")
    return obj

@app.get("/projects/{project_id}/modules", response_model=list[ModuleOut])
def list_modules(project_id: int, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    return db.query(Module).filter(Module.project_id == project_id).order_by(Module.id).all()

@app.get("/projects/{project_id}/dependencies")
def list_dependencies(project_id: int, db: Session = Depends(get_db)):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    ids = {m.id for m in db.query(Module).filter(Module.project_id == project_id).all()}
    return [{"id": d.id, "source_module_id": d.source_module_id, "target_module_id": d.target_module_id}
            for d in db.query(Dependency).all() if d.source_module_id in ids and d.target_module_id in ids]

@app.post("/dependencies", status_code=201)
def create_dependency(data: DependencyCreate, db: Session = Depends(get_db)):
    source, target = db.get(Module, data.source_module_id), db.get(Module, data.target_module_id)
    if not source or not target:
        raise HTTPException(404, "Source or target module not found")
    if source.id == target.id:
        raise HTTPException(400, "A module cannot depend on itself")
    if source.project_id != target.project_id:
        raise HTTPException(400, "Modules must belong to the same project")
    obj = Dependency(source_module_id=source.id, target_module_id=target.id)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Dependency already exists")
    return {"id": obj.id, "source_module_id": obj.source_module_id, "target_module_id": obj.target_module_id, "message": "Dependency created"}

@app.post("/tests", response_model=TestOut, status_code=201)
def create_test(data: TestCreate, db: Session = Depends(get_db)):
    if not db.get(Module, data.module_id):
        raise HTTPException(404, "Module not found")
    if not data.name.strip():
        raise HTTPException(422, "Test name cannot be blank")
    obj = TestCase(module_id=data.module_id, name=data.name.strip())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@app.get("/modules/{module_id}/tests", response_model=list[TestOut])
def list_tests(module_id: int, db: Session = Depends(get_db)):
    if not db.get(Module, module_id):
        raise HTTPException(404, "Module not found")
    return db.query(TestCase).filter(TestCase.module_id == module_id).order_by(TestCase.id).all()

def analyze_graph(changed, modules, dependencies, tests, change_type):
    # Edge A -> B means A depends on B, so traverse reverse edges from changed B.
    reverse = defaultdict(list)
    by_id = {m.id: m for m in modules}
    for edge in dependencies:
        reverse[edge.target_module_id].append(edge.source_module_id)
    found, queue = set(), deque([changed.id])
    while queue:
        current = queue.popleft()
        for caller in reverse[current]:
            if caller != changed.id and caller not in found:
                found.add(caller)
                queue.append(caller)
    affected = [by_id[mid] for mid in sorted(found) if mid in by_id]
    relevant = [changed] + affected
    relevant_ids = {m.id for m in relevant}
    recommended = [t for t in tests if t.module_id in relevant_ids]
    tested_ids = {t.module_id for t in recommended}
    gaps = [m.name for m in relevant if m.id not in tested_ids]
    type_weight = {"bugfix": 1, "feature": 2, "refactor": 3, "breaking": 4}[change_type]
    complexity_total = sum(m.complexity for m in relevant)
    gap_ratio = len(gaps) / max(1, len(relevant))
    score = round(min(100.0, 10 * type_weight + 5 * len(affected) + 4 * complexity_total + 20 * gap_ratio), 1)
    level = "Low" if score < 30 else "Medium" if score < 60 else "High"
    return {
        "changed_module": changed.name, "changed_module_id": changed.id, "change_type": change_type,
        "affected_modules": [{"id": m.id, "name": m.name, "complexity": m.complexity} for m in affected],
        "affected_count": len(affected),
        "recommended_tests": [{"id": t.id, "name": t.name, "module_id": t.module_id, "status": t.status} for t in recommended],
        "untested_modules": gaps, "risk_score": score, "risk_level": level,
        "risk_reasons": [f"Change type weight: {type_weight}/4", f"Potentially affected modules: {len(affected)}",
                         f"Combined complexity: {complexity_total}", f"Modules without linked tests: {len(gaps)} of {len(relevant)}"],
        "disclaimer": "Heuristic priority score only; it is not a measured probability of a defect."
    }

@app.post("/analyses", status_code=201)
def create_analysis(data: AnalysisCreate, db: Session = Depends(get_db)):
    changed = db.get(Module, data.module_id)
    if not changed:
        raise HTTPException(404, "Module not found")
    modules = db.query(Module).filter(Module.project_id == changed.project_id).all()
    ids = {m.id for m in modules}
    dependencies = [d for d in db.query(Dependency).all() if d.source_module_id in ids and d.target_module_id in ids]
    tests = db.query(TestCase).filter(TestCase.module_id.in_(ids)).all()
    result = analyze_graph(changed, modules, dependencies, tests, data.change_type)
    record = ChangeAnalysis(module_id=changed.id, change_type=data.change_type, risk_score=result["risk_score"], risk_level=result["risk_level"], result_json=json.dumps(result))
    db.add(record); db.commit(); db.refresh(record)
    result["analysis_id"] = record.id
    return result

@app.get("/analyses")
def list_analyses(db: Session = Depends(get_db)):
    rows = db.query(ChangeAnalysis).order_by(ChangeAnalysis.id.desc()).limit(100).all()
    output = []
    for row in rows:
        module = db.get(Module, row.module_id)
        output.append({"id": row.id, "module_id": row.module_id, "module_name": module.name if module else "(deleted)",
                       "change_type": row.change_type, "risk_score": row.risk_score, "risk_level": row.risk_level,
                       "created_at": row.created_at.isoformat() if row.created_at else None, "result": json.loads(row.result_json)})
    return output

@app.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    row = db.get(ChangeAnalysis, analysis_id)
    if not row:
        raise HTTPException(404, "Analysis not found")
    result = json.loads(row.result_json)
    result["analysis_id"] = row.id
    result["created_at"] = row.created_at.isoformat() if row.created_at else None
    return result
