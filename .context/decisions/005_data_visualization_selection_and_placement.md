# Decision: Data Visualization Selection and Placement

---
id: DECISION-005
date: 2025-03-31
status: decided
related_tasks: [TASK-005, TASK-014]
related_decisions: [DECISION-004] 
---

## Context

Following discussions related to Task 005 (Enhanced Data Visualization) and Task 014 (Decide on Data Visualizations), there was a need to define the specific visualizations to implement, determine their placement within the UI (especially considering mobile-first usage), and establish the appropriate scope of historical data to use for calculations.

## Decision

1.  **Selected Visualizations:** Implement the following set of visualizations, prioritizing those that leverage the application's unique subjective feedback metrics and provide actionable insights:
    *   Mesocycle Progress Charts (Volume, Stimulus, Fatigue - separate charts).
    *   Rep Range/Load vs. Stimulus Distribution.
    *   Subjective Feedback Trends (Burn, Pump, Perturbation, etc.).
    *   Exercise Stimulus-to-Fatigue Ratio (SFR) Ranking.
    *   Workout Adherence Visualization.
    *   Correlation Plots (Objective vs. Subjective).
    *   Training Frequency/Recency Heatmap.
    *   Personal Record (PR) Timeline/Feed.
    *   (Future) SFR Management Features (Trend charts, indicators, diagnostics, suggestions).

2.  **UI Placement Strategy (Mobile-First):** Adopt a hybrid approach:
    *   **Dashboard:** Quick glance info (Frequency Heatmap, Recent PRs, simple Adherence).
    *   **Dedicated Analytics Section:** Main hub for deep dives, using tabs (Trends, Exercises, Records), vertical stacking, cards, summaries first, and clear mobile-friendly filters.
    *   **Contextual Placement:**
        *   *Exercise Detail Page:* Exercise-specific charts (Progress, SFR, Rep/Stimulus) & links.
        *   *Exercise List Accordions:* Lazy-loaded, simple metrics (SFR score), sparklines (e1RM trend), text tips, and links to full Analytics section (pre-filtered). Performance is key here.
        *   *Workout Summary:* Workout-specific adherence, PRs achieved.

3.  **Data Scope:** For analytics calculations (SFR, trends, etc.), fetch and process data covering the **current mesocycle plus the last 3 completed mesocycles** by default.

## Rationale

*   The selected visualizations provide a comprehensive view of user progress, leveraging both objective data and unique subjective feedback for deeper insights (e.g., SFR).
*   The UI placement strategy balances immediate feedback (Dashboard) with detailed analysis capabilities (Analytics Section) and relevant contextual information (Exercise pages, Workout Summary) while prioritizing mobile usability and performance (lazy loading in accordions).
*   The data scope (current + last 3 mesocycles) offers a good balance between data relevance for recent trends, sufficient data volume for meaningful calculations, and query performance.

## Implications

*   Requires significant backend development for data fetching, aggregation, and calculation logic (especially SFR).
*   Requires frontend development for chart components (likely Plotly.js wrappers), structuring the Analytics section, and implementing lazy-loading/contextual displays in Exercise List accordions.
*   Refines the scope of Task 005 and effectively completes the primary objective of Task 014 (selection).
*   Future work needed to detail the implementation of SFR Management features.
