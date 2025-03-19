# Suggest Mesocycle Starting Points

---
id: TASK-013
status: planned
priority: medium
dependencies: [008, 012]
assigned: TBD
---

## Description
Currently, users must manually determine appropriate starting points for new mesocycles, which can lead to suboptimal training plans. This task aims to implement a feature that suggests appropriate starting weights, reps, and other parameters for new mesocycles based on previous performance data. 

## Objectives
- [ ] Design algorithm for suggesting mesocycle starting points
- [ ] Integrate with existing analytics data from previous mesocycles
- [ ] Implement UI for presenting suggestions to users
- [ ] Allow customization of suggested starting points
- [ ] Add explanation for suggested values to improve user understanding

## Technical Notes
- Leverage existing performance metrics and historical data
- Consider factors like previous 1RM, fatigue accumulation, and progression rates
- Implement confidence scores for suggestions
- Allow for manual overrides while keeping suggestions available
- Consider both volume and intensity parameters for suggestions

## Validation
- [ ] Test suggestion accuracy against historical progression patterns
- [ ] User testing for suggestion UI
- [ ] Verify suggestions for different training styles and experience levels
- [ ] Test edge cases (new exercises, long breaks between mesocycles)

## Progress
- Started: TBD
- Updates: TBD
- Completed: TBD

## Related
- Task 008: Analytics Enhancement Implementation
- Task 012: Improve Last Mesocycle Workout Handling
- Analytics functionality in `src/lib/server/metrics.ts`
