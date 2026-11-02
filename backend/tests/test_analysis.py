import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from main import analyze_graph
from models import Module, Dependency, TestCase

def mod(i, name, complexity=3):
    return Module(id=i, name=name, complexity=complexity, project_id=1)

def test_finds_direct_and_indirect_callers_and_test_gaps():
    auth, payment, checkout = mod(1, "Auth"), mod(2, "Payment"), mod(3, "Checkout")
    edges = [Dependency(source_module_id=2, target_module_id=1), Dependency(source_module_id=3, target_module_id=2)]
    tests = [TestCase(id=1, module_id=1, name="Auth test", status="Not Run"), TestCase(id=2, module_id=3, name="Checkout test", status="Not Run")]
    result = analyze_graph(auth, [auth, payment, checkout], edges, tests, "breaking")
    assert {m["name"] for m in result["affected_modules"]} == {"Payment", "Checkout"}
    assert {t["name"] for t in result["recommended_tests"]} == {"Auth test", "Checkout test"}
    assert result["untested_modules"] == ["Payment"]

def test_isolated_module():
    item = mod(1, "Standalone")
    result = analyze_graph(item, [item], [], [], "bugfix")
    assert result["affected_count"] == 0
    assert result["untested_modules"] == ["Standalone"]

def test_cycle_terminates():
    a, b = mod(1, "A"), mod(2, "B")
    edges = [Dependency(source_module_id=1, target_module_id=2), Dependency(source_module_id=2, target_module_id=1)]
    result = analyze_graph(a, [a, b], edges, [], "feature")
    assert result["affected_count"] == 1
