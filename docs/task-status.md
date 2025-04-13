# Task Status

Task Genius allows you to define and manage various statuses for your tasks, going beyond the standard Obsidian `- [ ]` (incomplete) and `- [x]` (complete).

## Core Concepts

*   **Status Markers:** Define specific characters within the task brackets (`[ ]`) to represent different states (e.g., `[/]` for In Progress, `[?]` for Planned).
*   **Status Cycling:** Quickly switch between defined statuses using clicks or commands.
*   **Progress Calculation:** Configure how different statuses contribute to the progress bar calculation.

## Configuration

Customize task status behavior in `Settings` -> `Task Genius` -> `Task Status`.

### General Behavior

*   **Auto complete parent task:** Automatically mark a parent task as completed (`- [x]`) when all its direct sub-tasks are completed.
*   **Mark parent as 'In Progress' when partially complete:** If the above is enabled, automatically set the parent task's status to the first "In Progress" marker defined in your settings when *some* but not *all* children are complete.

### Status Definitions & Counting

*   **Status Themes Dropdown:** Quickly apply predefined sets of status markers (e.g., "Things", "Dataview", "Minimal"). Select "Custom" to use your own definitions below. *Applying a theme will overwrite your custom settings.*
*   **Task Status Markers:** Define the character(s) used for each status category. Use `|` to specify multiple markers for a single category (e.g., `x|X` for Completed).
    *   `Completed task markers` (e.g., `x|X|✓`)
    *   `Planned task markers` (e.g., `?`)
    *   `In progress task markers` (e.g., `>|/|⟳`)
    *   `Abandoned task markers` (e.g., `-|✗`)
    *   `Not started task markers` (Default: ` ` (space))
*   **Count other statuses as:** Determine how tasks with unrecognized markers (not defined above) are treated in progress calculations (e.g., count them as 'Not Started', 'Abandoned', etc.).
*   **Exclude specific task markers:** Enter markers (separated by `|`) that should *not* be counted towards the total number of tasks for progress calculation (e.g., `?|/`).
*   **Only count specific task markers:** Enable this toggle to *only* count tasks with the specified markers.
    *   **Specific task markers to count:** Define the *only* markers (separated by `|`) that contribute to the total task count (e.g., `x|X|>|/`).

### Task Status Switcher (Cycling)

Configure how you interactively change task statuses.

*   **Enable task status switcher:** Master toggle for status cycling via clicks or commands.
*   **Enable custom task marks:** (Requires switcher enabled) In Reading View, replace the standard checkbox `- [ ]` with a visually styled representation of the task's current status marker (e.g., show `TODO` instead of `[ ]`). Clicking this mark cycles the status.
*   **Enable text mark in source mode:** (Requires switcher enabled) Allow clicking the status marker` directly in Source Mode to cycle the status.
*   **Enable cycle complete status:** Automatically cycle the status when the mark itself is pressed (useful in combination with the above settings).
*   **Always cycle new tasks:** When a new task is created (e.g., by pressing Enter), immediately cycle it to the *next* status in your defined sequence. If disabled, newly created tasks keep their initial status mark if it's valid.
*   **Task status cycle and marks:**
    *   **Themes Dropdown:** Apply predefined cycles and marks. *Applying a theme overwrites custom settings.*
    *   **Manual Configuration:** Define the exact sequence of statuses for cycling.
        *   Use `Add Status` to create new states.
        *   For each status:
            *   Set the **Status name**.
            *   Set the single **Mark** character (e.g., ` `, `x`, `/`, `?`, `-`).
            *   Toggle **Include in cycle** to determine if this status is part of the automatic click/command cycle.
            *   Use arrow buttons to **reorder** the cycle sequence.
            *   Use the trash icon to **remove** a status from the list (its definition might remain if used elsewhere).

## Commands

*   `Task Genius: Cycle task status forward`: Change the status of the task at the cursor to the next status in the defined cycle.
*   `Task Genius: Cycle task status backward`: Change the status of the task at the cursor to the previous status in the defined cycle.
