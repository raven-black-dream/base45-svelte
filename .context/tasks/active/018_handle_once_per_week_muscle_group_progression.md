# Handle Once Per Week Muscle Group Progression

---
id: TASK-018
status: planned
priority: high
dependencies: [010]
assigned: TBD
---

## Description
Currently, our progression system is optimized for muscle groups that are worked multiple times per week. We need to implement special handling for muscle groups that are only trained once per week, as these require different progression strategies to ensure optimal gains. This includes updating progression algorithms and feedback mechanisms to account for the longer recovery periods.

## Objectives
- [ ] Identify and tag muscle groups that are only trained once per week
- [ ] Implement modified progression algorithm for once-per-week muscle groups
- [ ] Update the soreness and performance tracking for longer recovery cycles
- [ ] Adjust deload calculations for once-per-week training frequencies
- [ ] Add user interface elements to show different progression strategies

## Technical Notes
- The current `progression.ts` functions need to be updated to check training frequency
- Once-per-week muscle groups should potentially progress more aggressively in each session
- We need to account for longer recovery windows when calculating soreness feedback
- May need to adapt the `repProgressionAlgorithm` and `loadProgressionAlgorithm` functions
- Consider using a sliding window of more than one week for performance metrics

## Validation
- [ ] Test progression across multiple mesocycles for once-per-week muscle groups
- [ ] Compare progression rates with muscle groups trained multiple times per week
- [ ] Verify that deload calculations work correctly for different training frequencies
- [ ] Get user feedback on whether the progression feels appropriate

## Progress
- Started: TBD
- Updates: TBD
- Completed: TBD

## Related
- Task 010: Ensure Set Order in Progression Functions
- `src/lib/server/progression.ts`
- `src/routes/workout/[slug]/+page.server.ts`
