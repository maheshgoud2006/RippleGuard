# RippleGuard Test Plan

## Test levels
- Unit: graph traversal, cycles, risk score, recommendations.
- Integration: API endpoints and persistence.
- UI: forms, validation, graph and report display.
- Regression: rerun tests after analysis changes.

## Manual cases
| ID | Scenario | Expected result |
|---|---|---|
| TC-01 | Create valid project | Project saved |
| TC-02 | Duplicate project name | HTTP 409 |
| TC-03 | Add module to unknown project | HTTP 404 |
| TC-04 | Self-dependency | HTTP 400 |
| TC-05 | Cross-project dependency | HTTP 400 |
| TC-06 | Duplicate dependency | HTTP 409 |
| TC-07 | Analyze connected chain | Direct and indirect callers found |
| TC-08 | Analyze isolated module | Empty affected list |
| TC-09 | Missing test registrations | Coverage gaps shown |
| TC-10 | Restart API then read history | Saved history remains |

Run automated tests from `backend/` with `pytest -q`. The provided suite tests graph logic; add API integration and browser tests before production use.
