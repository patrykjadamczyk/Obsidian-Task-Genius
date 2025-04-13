# Task Mover

Task Mover helps you keep your active notes clean by archiving completed tasks (or other groups of tasks) to a designated file.

## Configuration

Set up the Task Mover in `Settings` -> `Task Genius` -> `Task Mover`.

*   **Enable completed task mover:** Master toggle to enable the task moving commands.
*   **Task marker type:** Choose how moved tasks should be marked in the destination file:
    *   `Version marker`: Appends static text (e.g., "archived v1.0").
    *   `Date marker`: Appends text with the current date (e.g., "moved on 2023-12-31").
    *   `Custom marker`: Appends text with flexible date formatting.
*   **Marker Text:** Define the specific text based on the selected type:
    *   `Version marker text`: (e.g., `Archived v1.0`)
    *   `Date marker text`: Use `{{date}}` for the current date in the default format. (e.g., `Moved on {{date}}`)
    *   `Custom marker text`: Use `{{DATE:format}}` for custom date formats (e.g., `Archived {{DATE:YYYY-MM-DD HH:mm}}`). Refer to Moment.js formatting tokens.
*   **Treat abandoned tasks as completed:** Include tasks marked with your defined 'abandoned' statuses when moving "completed" tasks.
*   **Complete all moved tasks:** Ensure that any task moved using the "Move all subtasks" command is marked as complete (`- [x]`) in the destination file, regardless of its original status.
*   **With current file link:** When moving tasks, add a link back to the source file under the parent task in the destination file.

## Commands

Place your cursor on the parent task whose sub-tasks you want to move, then run one of the following commands:

*   **`Task Genius: Move all completed subtasks to another file`:** Finds all completed (and optionally abandoned) tasks nested under the current task (at any level) and moves them to the target file defined in your Quick Capture settings (`Target file`).
*   **`Task Genius: Move direct completed subtasks to another file`:** Moves only the *immediate* children of the current task that are completed (and optionally abandoned).
*   **`Task Genius: Move all subtasks to another file`:** Moves *all* tasks nested under the current task (at any level), regardless of their completion status.
*   **`Task Genius: Move task to another file`:** Moves task line the cursor is currently on to the target file. And all its subtasks will be moved as well.
