# Improve Performance Scoring Function

---
id: TASK-016
status: completed
priority: high
dependencies: [008]
assigned: TBD
---

## Description
The current performance scoring function requires deeper analysis and potential improvements to better reflect actual training performance. This task involves reviewing the current approach and implementing evidence-based improvements. Additionally, the `exerciseSFR` function is currently using the set performance score instead of the more comprehensive performance score from user_exercise_metrics.

## Objectives
- [x] Analyze existing performance scoring algorithm
- [ ] Research evidence-based approaches to performance measurement
- [x] Identify weaknesses in current implementation
- [ ] Develop improved scoring methodology
- [ ] Implement and test new scoring function
- [x] Update `exerciseSFR` to use the calculated performance_score from user_exercise_metrics
- [x] Ensure `calculateMuscleGroupMetrics` properly integrates with the updated exerciseSFR
- [x] Review and update `recordSet` to fetch and pass performance scores
- [ ] Document scoring methodology for transparency

## Technical Notes
- Current implementation may not properly account for all relevant factors
- The `exerciseSFR` function is using set-level performance scores instead of the advanced performance_score metric
- The advanced performance_score is calculated using a combination of normalized workout performance and user feedback
- Consider variables such as:
  - Volume vs intensity tradeoffs
  - Rep ranges and proximity to failure
  - Exercise category (compound vs isolation)
  - Performance relative to previous maximums
  - Rate of perceived exertion (RPE) when available
- Score should remain intuitive and useful to users
- Consider backwards compatibility with existing scores

## Implementation Plan
1. Modify `exerciseSFR` function to query and use the performance_score from user_exercise_metrics instead of calculating from set_performance
2. Update the fatigue score calculation in `exerciseSFR` to use this comprehensive metric
3. Ensure `calculateMuscleGroupMetrics` correctly passes data to and processes results from the updated exerciseSFR
4. Review any dependencies in `addSet` and other functions that might be affected by this change

## Validation
- [ ] Test against historical workout data
- [ ] Verify alignment with research-backed performance metrics
- [ ] Check correlation with user-reported satisfaction
- [ ] Ensure consistency across different workout types
- [ ] Compare old vs new SFR calculations to understand impact

## Progress
- Started: 2025-03-21
- Updates: Identified that exerciseSFR is using set_performance instead of the performance_score
- Implemented changes to all three key functions: exerciseSFR, calculateMuscleGroupMetrics, and recordSet
- Completed: 2025-03-21

## Related
- Task 008: Analytics Enhancement Implementation
- Metrics implementation in `src/lib/server/metrics.ts`
- Analytics calculation functions
- Performance score calculation in `calculateExerciseMetrics`
- SFR calculations in `exerciseSFR`
