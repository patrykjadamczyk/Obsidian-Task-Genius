# Workflow Management

Task Genius includes a powerful workflow system to help you manage multi-stage tasks and processes directly within Obsidian.

## Enabling Workflows

*   Go to `Settings` -> `Task Genius` -> `Workflow`.
*   Toggle **Enable workflow** on.

## Configuration

Fine-tune workflow behavior:

*   **Auto-add timestamp:** Automatically append a timestamp to a task when it enters a workflow stage (or is created within one).
    *   **Timestamp format:** Define the date/time format using Moment.js tokens (e.g., `YYYY-MM-DD HH:mm`).
    *   **Remove timestamp when moving to next stage:** Delete the timestamp from the task when it transitions to the next workflow stage.
*   **Calculate spent time:** Track the time a task spends in a stage. When the task moves to the next stage, append the duration.
    *   **Spent time format:** Define the format for the duration (e.g., `HH:mm:ss`).
    *   **Calculate full spent time:** Track the total time from the *start* of the workflow to the *completion* of the final stage.
*   **Auto remove last stage marker:** When a task marked with the *final* stage of its workflow is completed (`- [x]`), automatically remove the stage marker text.
*   **Auto-add next task:** When completing a task that is part of a workflow, automatically create a new task below it, marked with the *next* stage in the sequence.

## Workflow Definitions

Workflows are defined as templates that specify a sequence of stages.

*   **Managing Workflows:** In `Settings` -> `Task Genius` -> `Workflow`:
    *   Click `Add New Workflow` to open a modal where you can define a new workflow template.
    *   Click the pencil icon (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>) to edit an existing workflow.
    *   Click the trash icon (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-trash"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>) to delete a workflow definition.
*   **Defining a Workflow (in Modal):**
    *   **Name & Description:** Identify the workflow.
    *   **Stages:** Add, remove, and reorder the stages.
        *   **Name:** The text representing the stage (e.g., "Todo", "Doing", "Review", "Done"). This text will likely appear on the task.
        *   **Type:**
            *   `Cycle`: A standard stage in the workflow sequence.
            *   `Terminal`: The final stage(s) of the workflow.
*   **Metadata:** Tracks version and modification dates.

## Using Workflows

1.  **Associate Task with Workflow:** (Implementation detail - likely achieved by adding a specific tag or metadata to the task, e.g., `#workflow/MyProcessName`. The exact method depends on how the plugin identifies the active workflow for a task.)
2.  **Initial Stage:** When a task is associated with a workflow, it should ideally be marked with the first stage name (e.g., `- [ ] Task description #workflow/MyProcessName`).
```markdown
- [ ] Task description #workflow/MyProcessName
	- [ ] Sub-task 1 [stage::TODO] 📅 2025-01-01 03:00
```

3.  **Transitioning Stages:**
    *   **Context Menu:** Right-click on a task associated with a workflow. You should see options like "Move to [Next Stage Name]". Selecting this updates the task's stage marker (and potentially adds timestamps/durations based on settings).
    *   **Manual Editing:** You can manually change the stage marker text.
4.  **Automation:** Based on your configuration, timestamps, spent time, next tasks, and marker removal might happen automatically upon stage transitions or task completion.
