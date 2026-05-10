# AI PR Reviewer Benchmark Evaluation

| Benchmark | Expected Issue | Detected? | Severity Correct? | False Positive? | Notes |
|---|---|---|---|---|---|
| hardcoded-secret | Hardcoded JWT secret | Yes | Yes | No | Detected by rule + Gemini |
| missing-validation | Missing req.body validation | Yes | Yes | No | Detected unsafe DB query |
| missing-pagination | Unbounded query / missing pagination | Yes | Yes | No | Rule + Gemini confidence high |
| n-plus-one-query | DB call inside loop | No | No | Yes | Detected Pagination issue which does not exist |
| missing-authorization | Delete/update without auth | Yes | Yes  | No  |  |
| sensitive-data-leak | Returning private fields | Yes | Yes | Yes  | No |
| logic-bug | Missing return / double response | Yes | No | No |  |
| api-contract-mismatch | Frontend/backend mismatch | Yes | Yes | No |  |
| clean-pr | No issue expected | Yes | Yes | No  |  |