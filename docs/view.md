# Task Genius View

The Task Genius View provides a dedicated, feature-rich interface for managing all your tasks across your Obsidian vault. It aggregates tasks based on your settings and allows for sorting, filtering, reviewing, and editing.

## Enabling and Opening

*   **Enable:** Go to `Settings` -> `Task Genius` -> `View` and toggle **Enable task genius view** on. The plugin will start indexing your tasks in the background.
*   **Open:**
    *   Click the Task Genius ribbon icon (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-list-checks"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>).
    *   Use the command `Task Genius: Open Task Genius view`.

## Components

The view is typically divided into three main areas:

1.  **Sidebar (Left):**
    *   **Navigation:** Select different perspectives on your tasks:
        *   `Inbox`: Often used for unprocessed or default task views.
        *   `Forecast`: View tasks based on upcoming due dates or overdue status.
        *   `Tags`: Group and view tasks by their tags (`#tag`).
        *   `Projects`: Group tasks based on inferred projects (often by folder structure or specific tags).
		*   `Flagged`: Group tasks based on the `flagged` tag or priority. 
        *   `Review`: Surface tasks needing review based on criteria like age or lack of date.
    *   **Toggle Button:** A button (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-panel-left-dashed"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M16 7v4"/><path d="M16 15v2"/></svg>) in the view header collapses or expands the sidebar.
2.  **Content Area (Center):**
    *   Displays the list of tasks based on the selected sidebar view mode.
    *   **Task Interaction:**
        *   Click the checkbox or status marker to toggle completion/cycle status.
        *   Click on the task text to select it and show its details in the right panel.
        *   Right-click a task for a context menu (Complete, Switch Status, Edit, Edit in File).
3.  **Details Panel (Right):**
    *   Shows detailed information about the currently selected task.
    *   **Editable Fields:** Modify the task's description, due date, priority, tags, notes, etc. Changes are saved back to the original file.
    *   **Actions:** Buttons or icons to toggle completion, edit in the source file, etc.
    *   **Toggle Button:** A button (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-panel-right-dashed"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/><path d="M8 7v4"/><path d="M8 15v2"/></svg>) in the view header shows or hides this panel. It appears automatically when a task is selected.

## Actions & Data Management

*   **Quick Capture:** A dedicated button (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-check-square"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>) in the view header allows quick task capture using the full-featured modal.
*   **Settings:** Access plugin settings via the pane menu (three dots in the view tab header).
*   **Task Index:** The view relies on an internal index of your tasks. If tasks seem missing or outdated:
    *   **Command:** `Task Genius: Refresh task index`: Re-scans recently changed files.
    *   **Command:** `Task Genius: Force reindex all tasks`: Clears the cache and completely rebuilds the index from scratch (takes longer but resolves persistent issues). This can also be triggered from `Settings` -> `Task Genius` -> `View` -> `Rebuild index`.
