# Progress Bar

Task Genius automatically adds progress indicators to parent list items, reflecting the completion status of their nested sub-items (tasks or regular list items). This helps you visualize progress at a glance.

## Configuration

You can customize the progress bar behavior in `Settings` -> `Task Genius` -> `Progress Bar`.

*   **Progress display mode:** Choose how progress is shown:
    *   `No progress indicators`: Disable all progress indicators.
    *   `Graphical progress bar`: Show a visual bar.
    *   `Text progress indicator`: Show text like `[3/5]` or `60%`.
    *   `Both graphical and text`: Show both indicators.
*   **Support hover to show progress info:** (Requires `graphical`, `text`, or `both`) Enable a popover showing detailed counts (Completed, In Progress, etc.) when hovering over the indicator.
*   **Add progress bar to non-task bullet:** Apply progress calculation and display to regular list items (`- Item`), not just tasks (`- [ ] Task`).
*   **Add progress bar to Heading:** Calculate and display progress for all tasks found under a heading.
*   **Count sub children of current Task:** Include tasks at deeper nesting levels (sub-sub-tasks, etc.) in the progress calculation for the main parent task.

## Text Progress Format

When `Progress display mode` is set to `text` or `both`, you can customize the text format:

*   **Progress format:** Select a predefined format:
    *   `Percentage (75%)`
    *   `Bracketed percentage ([75%])`
    *   `Fraction (3/4)`
    *   `Bracketed fraction ([3/4])`
    *   `Detailed ([3✓ 1⟳ 0✗ 1? / 5])` (Shows counts for different status types)
    *   `Custom format` (See below)
    *   `Range-based text` (See below)
*   **Custom format:** Define your own format using placeholders and expressions.
    *   **Placeholders:** `{{COMPLETED}}`, `{{TOTAL}}`, `{{IN_PROGRESS}}`, `{{ABANDONED}}`, `{{PLANNED}}`, `{{NOT_STARTED}}`, `{{PERCENT}}`, `{{COMPLETED_SYMBOL}}`, `{{IN_PROGRESS_SYMBOL}}`, `{{ABANDONED_SYMBOL}}`, `{{PLANNED_SYMBOL}}`.
    *   **Expressions:** Use JavaScript-like expressions within `${=...}`. Access data via `data` object (e.g., `data.percentages.completed`).
        *   Example (Text Bar): `${="=".repeat(Math.floor(data.percentages.completed/10)) + " ".repeat(10-Math.floor(data.percentages.completed/10))}] {{PERCENT}}%`
        *   Example (Emoji Bar): `${="⬛".repeat(Math.floor(data.percentages.completed/10)) + "⬜".repeat(10-Math.floor(data.percentages.completed/10))} {{PERCENT}}%`
        *   Example (Conditional Emoji): `{{COMPLETED}}/{{TOTAL}} ${=data.percentages.completed < 30 ? '🔴' : data.percentages.completed < 70 ? '🟠' : '🟢'}`
*   **Range-based text:** Display different text messages based on the completion percentage.
    *   **Show percentage:** Toggle whether to show `[3/5]` or `60%`.
    *   **Customize progress ranges:** Enable this to define custom ranges and text templates (using `{{PROGRESS}}` placeholder). You can add, edit, delete, and reset ranges.

## Hiding Progress Bars

You can prevent progress bars from appearing in specific contexts:

*   **Hide progress bars based on conditions:** Enable this master toggle to use hiding rules.
*   **Hide by tags:** Enter comma-separated tags (without `#`). If a parent item contains any of these tags, its progress bar will be hidden. (e.g., `noprog`, `hidebar`)
*   **Hide by folders:** Enter comma-separated folder paths. Progress bars in notes within these folders (and subfolders) will be hidden. (e.g., `Meetings`, `Archived/Projects`)
*   **Hide by metadata:** Specify a frontmatter key-value pair. Notes with matching frontmatter will hide progress bars. (e.g., `hide-progress: true`)
