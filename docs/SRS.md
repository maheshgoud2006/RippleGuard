# RippleGuard — Software Requirements Specification

## 1. Purpose
RippleGuard is a web application that models software modules and dependencies, estimates the impact of a proposed change, and recommends relevant tests.

## 2. Problem statement
A change to one component can affect dependent components. Manually tracing dependencies is time-consuming and may cause regression tests to be missed. RippleGuard makes the dependency graph visible and provides a repeatable analysis workflow.

## 3. Objectives
- Create projects and register modules.
- Define directed dependency relationships.
- Find direct and indirect affected modules.
- Recommend tests associated with affected modules.
- Highlight modules without registered tests.
- Save analysis history with an explainable heuristic risk score.

## 4. Functional requirements
FR-01 Create/list projects. FR-02 Create/list project modules. FR-03 Set module complexity from 1 to 5. FR-04 Create dependencies within one project. FR-05 Reject self-links and duplicate links. FR-06 Register tests for modules. FR-07 Analyze bugfix, feature, refactor, and breaking changes. FR-08 Traverse reverse dependencies. FR-09 Recommend tests. FR-10 Report test coverage gaps. FR-11 Save and retrieve analysis history.

## 5. Non-functional requirements
- Usability: responsive web UI for core workflows.
- Performance: graph traversal O(V+E), with V modules and E dependency edges.
- Reliability: validate API input and return useful errors.
- Maintainability: separate UI, API, persistence, and analysis logic.
- Testability: automated tests for graph logic.
- Security: current MVP is for local use; add authentication and authorization before public or multi-user deployment.

## 6. Scope and limitations
The first version uses manually entered dependency relationships. Source-code parsing and Git integration are future work. Risk scores are heuristic prioritization scores, not probabilities of defects.

## 7. Acceptance criteria
Projects/modules can be created; invalid dependencies are rejected; direct and indirect callers are found; relevant tests and coverage gaps are shown; analysis history persists; automated graph tests pass.
