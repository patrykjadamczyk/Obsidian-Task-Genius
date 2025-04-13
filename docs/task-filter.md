# Task Filter

The Task Filter allows you to dynamically hide or show tasks directly within the Obsidian editor based on various criteria. This is useful for focusing on specific types of tasks in long notes.

## Enabling the Filter

*   Go to `Settings` -> `Task Genius` -> `Task Filter`.
*   Toggle **Enable Task Filter** on.

## Using the Filter

1.  **Open the Panel:** Use the command `Task Genius: Toggle task filter panel`. A panel will appear at the top of the editor.
2.  **Select Filters:**
    *   **Task Status:** Check boxes to include tasks with specific statuses (Completed, In Progress, Abandoned, Not Started, Planned).
    *   **Related Tasks:** Choose whether to include Parent, Child, or Sibling tasks relative to the tasks matching other criteria.
    *   **Advanced Filter Query:** Enter text, tags (`#tag`), or use boolean logic (`AND`, `OR`, `NOT`) for more complex filtering based on task content. (e.g., `important AND #projectA NOT @waiting`)
    *   **Filter Mode:**
        *   `Show matching tasks` (INCLUDE): Only tasks matching the criteria will be visible.
        *   `Hide matching tasks` (EXCLUDE): Tasks matching the criteria will be hidden.
3.  **Apply:** The editor view will update automatically as you change filter options.
4.  **Close the Panel:** Use the toggle command again or click the close button on the panel.

## Preset Filters

You can save frequently used filter combinations as presets for quick access.

*   **Managing Presets:** In `Settings` -> `Task Genius` -> `Task Filter`:
    *   Click `Add New Preset` to create a new filter configuration.
    *   Click the pencil icon (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>) next to a preset to edit its name and filter options in a modal window.
    *   Click the trash icon (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-trash"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>) to delete a preset.
    *   Click `Reset to Default Presets` to restore the default set of filters (e.g., "Incomplete tasks", "Completed tasks").
*   **Using Presets:** In the Task Filter panel within the editor, select a saved preset from the dropdown menu to instantly apply its settings.
