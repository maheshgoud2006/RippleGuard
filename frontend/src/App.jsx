import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Boxes, CheckCircle2, ChevronRight, Clock3, GitBranch, LayoutDashboard, Plus, RefreshCw, ShieldCheck, TestTube2 } from "lucide-react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
async function api(path, options = {}) {
  const response = await fetch(API + path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}

export default function App() {
  const [projects,setProjects] = useState([]), [projectId,setProjectId] = useState("");
  const [modules,setModules] = useState([]), [dependencies,setDependencies] = useState([]), [history,setHistory] = useState([]);
  const [projectName,setProjectName] = useState(""), [projectDescription,setProjectDescription] = useState("");
  const [moduleName,setModuleName] = useState(""), [moduleDescription,setModuleDescription] = useState(""), [complexity,setComplexity] = useState("3");
  const [sourceId,setSourceId] = useState(""), [targetId,setTargetId] = useState("");
  const [testName,setTestName] = useState(""), [testModuleId,setTestModuleId] = useState("");
  const [changeModuleId,setChangeModuleId] = useState(""), [changeType,setChangeType] = useState("feature");
  const [result,setResult] = useState(null), [toast,setToast] = useState(""), [error,setError] = useState("");
  const [busy,setBusy] = useState(false), [tab,setTab] = useState("overview");

  async function refreshProjects() {
    const rows = await api("/projects"); setProjects(rows);
    if (!projectId && rows.length) setProjectId(String(rows[0].id));
  }
  async function refreshData(id) {
    if (!id) { setModules([]); setDependencies([]); setHistory([]); return; }
    const [ms,ds,hs] = await Promise.all([api(`/projects/${id}/modules`),api(`/projects/${id}/dependencies`),api("/analyses")]);
    setModules(ms); setDependencies(ds);
    const ids = new Set(ms.map(m => m.id)); setHistory(hs.filter(h => ids.has(h.module_id)));
  }
  useEffect(() => { refreshProjects().catch(e => setError(e.message)); }, []);
  useEffect(() => { if (projectId) refreshData(projectId).catch(e => setError(e.message)); else { setModules([]);setDependencies([]);setHistory([]); } setResult(null);setChangeModuleId(""); }, [projectId]);
  const project = projects.find(p => p.id === Number(projectId));

  const nodes = useMemo(() => {
    const levels = new Map();
    function level(id, path = new Set()) {
      if (levels.has(id)) return levels.get(id);
      if (path.has(id)) return 0;
      const nextPath = new Set(path); nextPath.add(id);
      const targets = dependencies.filter(d => d.source_module_id === id);
      const value = targets.length ? Math.min(5, 1 + Math.max(...targets.map(d => level(d.target_module_id, nextPath)))) : 0;
      levels.set(id,value); return value;
    }
    modules.forEach(m => level(m.id));
    const counts = {};
    return modules.map(m => { const l=levels.get(m.id)||0; counts[l]=(counts[l]||0)+1;
      const changed = result && result.changed_module_id === m.id;
      const affected = result && result.affected_modules.some(a => a.id === m.id);
      return {id:String(m.id),position:{x:l*220+40,y:(counts[l]-1)*115+35},data:{label:`${m.name}\nComplexity ${m.complexity}/5`},
        style:{background:changed?"#30275c":affected?"#3a2b20":"#151f34",color:"#eef2ff",border:`1px solid ${changed?"#a78bfa":affected?"#f5b76a":"#344563"}`,borderRadius:12,padding:12,width:160,whiteSpace:"pre-line",fontSize:12}};
    });
  },[modules,dependencies,result]);
  const edges = useMemo(() => dependencies.map(d => ({id:`e${d.id}`,source:String(d.source_module_id),target:String(d.target_module_id),label:"depends on",animated:Boolean(result),style:{stroke:"#7789ff",strokeWidth:1.8},labelStyle:{fill:"#aab6d1",fontSize:10}})),[dependencies,result]);

  async function action(fn, message) {
    setError("");setToast("");
    try { await fn(); if(message) setToast(message); } catch(e) { setError(e.message); }
  }
  async function createProject(e) {
    e.preventDefault();
    await action(async()=>{const p=await api("/projects",{method:"POST",body:JSON.stringify({name:projectName.trim(),description:projectDescription.trim()})});setProjectName("");setProjectDescription("");setProjects(await api("/projects"));setProjectId(String(p.id));},"Project created.");
  }
  async function addModule(e) {
    e.preventDefault();
    await action(async()=>{await api("/modules",{method:"POST",body:JSON.stringify({project_id:Number(projectId),name:moduleName.trim(),description:moduleDescription.trim(),complexity:Number(complexity)})});setModuleName("");setModuleDescription("");await refreshData(projectId);},"Module added.");
  }
  async function addDependency(e) {
    e.preventDefault();
    await action(async()=>{await api("/dependencies",{method:"POST",body:JSON.stringify({source_module_id:Number(sourceId),target_module_id:Number(targetId)})});await refreshData(projectId);},"Dependency connected.");
  }
  async function addTest(e) {
    e.preventDefault();
    await action(async()=>{await api("/tests",{method:"POST",body:JSON.stringify({module_id:Number(testModuleId),name:testName.trim()})});setTestName("");},"Test case registered. Run analysis again to include it.");
  }
  async function analyze(e) {
    e.preventDefault();setBusy(true);setError("");setToast("");setResult(null);
    try {const data=await api("/analyses",{method:"POST",body:JSON.stringify({module_id:Number(changeModuleId),change_type:changeType})});setResult(data);await refreshData(projectId);setTab("analysis");setToast("Impact analysis completed.");}
    catch(e){setError(e.message);} finally{setBusy(false);}
  }
  const stats=[{label:"Modules",value:modules.length,icon:Boxes},{label:"Dependencies",value:dependencies.length,icon:GitBranch},{label:"Saved analyses",value:history.length,icon:Activity}];

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><ShieldCheck size={22}/></div><div><b>RippleGuard</b><small>CHANGE INTELLIGENCE</small></div></div>
      <div className="side-label">WORKSPACE</div>
      {[["overview",LayoutDashboard,"Overview"],["graph",GitBranch,"Dependency graph"],["analysis",Activity,"Impact analysis"],["history",Clock3,"History"]].map(([id,Icon,label])=><button key={id} className={`nav-item ${tab===id?"active":""}`} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}
      <div className="sidebar-bottom"><i className="engine-dot"/><div><b>Analysis engine</b><small>Local development mode</small></div></div>
    </aside>
    <main className="main"><header className="header"><div><div className="crumb">WORKSPACE <ChevronRight size={13}/> SOFTWARE INTELLIGENCE</div><h1>{({overview:"Project overview",graph:"Dependency graph",analysis:"Change impact analysis",history:"Analysis history"})[tab]}</h1><p>Understand the ripple effect of every software change.</p></div><button className="secondary-button" onClick={()=>action(async()=>{setProjects(await api("/projects"));if(projectId)await refreshData(projectId);},"Workspace refreshed.")}><RefreshCw size={15}/> Refresh</button></header>
      {error&&<div className="alert error"><AlertTriangle size={17}/><span>{error}</span><button onClick={()=>setError("")}>×</button></div>}
      {toast&&<div className="alert success"><CheckCircle2 size={17}/><span>{toast}</span><button onClick={()=>setToast("")}>×</button></div>}
      <section className="project-bar card"><div><label htmlFor="project-select">ACTIVE PROJECT</label><select id="project-select" value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Select a project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="project-meta"><span className="status-pill"><i/> {project?"Project selected":"No project selected"}</span><span>{modules.length} components</span></div></section>
      {!project?<section className="card empty-project"><div className="empty-icon"><Boxes size={26}/></div><h2>Create your first project</h2><p>Start with a project, then add modules and dependency links.</p><form onSubmit={createProject} className="create-form"><input placeholder="Project name (e.g. Online Shopping System)" value={projectName} onChange={e=>setProjectName(e.target.value)} required/><input placeholder="Short description (optional)" value={projectDescription} onChange={e=>setProjectDescription(e.target.value)}/><button className="primary-button"><Plus size={16}/> Create project</button></form></section>:<>
        {tab==="overview"&&<>
          <div className="stats-grid">{stats.map(s=><div className="stat-card card" key={s.label}><div className="stat-top"><span>{s.label}</span><s.icon size={18}/></div><strong>{s.value}</strong><small>{s.label==="Modules"?"Registered components":s.label==="Dependencies"?"Connections in this project":"Saved in history"}</small></div>)}</div>
          <div className="content-grid">
            <section className="card"><div className="section-heading"><div><span className="section-index">01</span><h2>Software modules</h2></div><span className="count-badge">{modules.length}</span></div>
              <form className="form-stack" onSubmit={addModule}><label>Module name<input value={moduleName} onChange={e=>setModuleName(e.target.value)} placeholder="e.g. Authentication" required/></label><label>Description<input value={moduleDescription} onChange={e=>setModuleDescription(e.target.value)} placeholder="What does this module do?"/></label><label>Complexity <b>{complexity}/5</b><input type="range" min="1" max="5" value={complexity} onChange={e=>setComplexity(e.target.value)}/></label><button className="primary-button"><Plus size={15}/> Add module</button></form>
              <div className="module-table">{modules.map(m=><div className="module-row" key={m.id}><div className="module-symbol">{m.name.slice(0,1).toUpperCase()}</div><div className="module-name"><b>{m.name}</b><small>{m.description||`Module #${m.id}`}</small></div><span className={`complexity complexity-${m.complexity}`}>C{m.complexity}</span></div>)}{!modules.length&&<div className="empty-inline">No modules yet. Add your first module above.</div>}</div>
            </section>
            <section className="card"><div className="section-heading"><div><span className="section-index">02</span><h2>Dependency links</h2></div><GitBranch size={18}/></div><p className="muted">Source depends on target. Changing the target may affect the source.</p>
              <form className="form-stack" onSubmit={addDependency}><label>Source module<select value={sourceId} onChange={e=>setSourceId(e.target.value)} required><option value="">Choose source</option>{modules.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Target dependency<select value={targetId} onChange={e=>setTargetId(e.target.value)} required><option value="">Choose target</option>{modules.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><button className="primary-button" disabled={modules.length<2}><Plus size={15}/> Connect modules</button></form>
              <div className="edge-list">{dependencies.map(d=>{const s=modules.find(m=>m.id===d.source_module_id),t=modules.find(m=>m.id===d.target_module_id);return <div className="edge-row" key={d.id}><span>{s?.name||"?"}</span><ChevronRight size={15}/><span>{t?.name||"?"}</span></div>})}{!dependencies.length&&<div className="empty-inline">No links yet. Connect two modules.</div>}</div>
            </section>
          </div>
          <section className="card analyzer-card"><div className="section-heading"><div><span className="section-index">03</span><h2>Analyze a proposed change</h2></div><span className="live-tag"><i/> READY</span></div><p className="muted">Select the module being changed. RippleGuard traces reverse dependencies and recommends linked tests.</p><form className="analysis-form" onSubmit={analyze}><label>Changed module<select value={changeModuleId} onChange={e=>setChangeModuleId(e.target.value)} required><option value="">Select module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Change type<select value={changeType} onChange={e=>setChangeType(e.target.value)}><option value="bugfix">Bug fix</option><option value="feature">New feature</option><option value="refactor">Refactoring</option><option value="breaking">Breaking change</option></select></label><button className="primary-button" disabled={!modules.length||busy}>{busy?"Analyzing…":<><Activity size={16}/> Run impact analysis</>}</button></form></section>
          <section className="card test-card"><div className="section-heading"><div><span className="section-index">04</span><h2>Test case registry</h2></div><TestTube2 size={18}/></div><p className="muted">Register tests against modules to identify regression tests and coverage gaps.</p><form className="test-form" onSubmit={addTest}><label>Module<select value={testModuleId} onChange={e=>setTestModuleId(e.target.value)} required><option value="">Choose module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Test name<input value={testName} onChange={e=>setTestName(e.target.value)} placeholder="e.g. Login integration test" required/></label><button className="primary-button" disabled={!modules.length}><Plus size={15}/> Register test</button></form><p className="tiny-note">Run a new analysis after registering tests to update recommendations.</p></section>
        </>}
        {tab==="graph"&&<section className="card graph-card"><div className="section-heading"><div><span className="section-index">GRAPH</span><h2>Module dependency map</h2></div><span className="muted">{modules.length} nodes · {dependencies.length} edges</span></div><p className="muted">Arrows point from a module to its dependency. Changing a target may affect callers.</p><div className="graph-canvas"><ReactFlow nodes={nodes} edges={edges} fitView><Background color="#27334b" gap={20}/><Controls/><MiniMap nodeColor={n=>result&&result.changed_module_id===Number(n.id)?"#a78bfa":result&&result.affected_modules.some(m=>m.id===Number(n.id))?"#f5b76a":"#52648a"} maskColor="rgba(8,13,25,.75)"/></ReactFlow></div><div className="legend"><span><i className="legend-dot changed"/> Changed module</span><span><i className="legend-dot affected"/> Affected module</span><span><i className="legend-dot normal"/> Other module</span></div></section>}
        {tab==="analysis"&&<section className="card"><div className="section-heading"><div><span className="section-index">ANALYSIS</span><h2>Impact report</h2></div></div>{result?<AnalysisResult result={result}/>:<div className="empty-inline">Run an analysis from Overview to see results here.</div>}</section>}
        {tab==="history"&&<section className="card"><div className="section-heading"><div><span className="section-index">RECORDS</span><h2>Saved analyses</h2></div><span className="count-badge">{history.length}</span></div>{history.length?<div className="history-table"><div className="history-head"><span>MODULE</span><span>CHANGE</span><span>RISK</span><span>SCORE</span></div>{history.map(h=><button className="history-row" key={h.id} onClick={()=>{setResult({...h.result,analysis_id:h.id});setTab("analysis");}}><b>{h.module_name}</b><span>{h.change_type}</span><span className={`risk-pill risk-${h.risk_level.toLowerCase()}`}>{h.risk_level}</span><strong>{h.risk_score}/100</strong></button>)}</div>:<div className="empty-inline">No saved analyses for this project yet.</div>}</section>}
      </>}
      <footer className="footer"><span>RippleGuard <b>v1.0</b></span><span><i className="footer-dot"/> Local development environment</span><span>Change with confidence. Test with purpose.</span></footer>
    </main>
  </div>;
}

function AnalysisResult({result}) {
  return <div className="analysis-result"><div className="result-summary"><div><span className="eyebrow">ANALYSIS #{result.analysis_id||"SAVED"}</span><h2>{result.changed_module}</h2><p className="muted">Change type: {result.change_type}</p></div><div className={`risk-score risk-${result.risk_level.toLowerCase()}`}><strong>{result.risk_score}</strong><span>/100 · {result.risk_level} risk</span></div></div>
    <div className="result-metrics"><div><strong>{result.affected_count}</strong><span>Affected modules</span></div><div><strong>{result.recommended_tests.length}</strong><span>Recommended tests</span></div><div><strong>{result.untested_modules.length}</strong><span>Coverage gaps</span></div></div>
    <div className="result-columns"><section><h3>Potentially affected modules</h3>{result.affected_modules.length?<ul>{result.affected_modules.map(m=><li key={m.id}><b>{m.name}</b><small>Complexity {m.complexity}/5</small></li>)}</ul>:<p className="muted">No dependent callers found.</p>}<h3>Modules without linked tests</h3>{result.untested_modules.length?<ul>{result.untested_modules.map(n=><li key={n}>{n}</li>)}</ul>:<p className="muted">All relevant modules have linked tests.</p>}</section><section><h3>Recommended tests</h3>{result.recommended_tests.length?<ul>{result.recommended_tests.map(t=><li key={t.id}><b>{t.name}</b><small>{t.status}</small></li>)}</ul>:<p className="muted">No linked tests found.</p>}<h3>Risk explanation</h3><ul>{result.risk_reasons.map(r=><li key={r}>{r}</li>)}</ul></section></div><p className="disclaimer"><AlertTriangle size={15}/>{result.disclaimer}</p></div>;
}
