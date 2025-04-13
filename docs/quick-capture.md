# Quick Capture

Quick Capture provides fast ways to add tasks or notes to designated files without significantly interrupting your current workflow.

## Configuration

Adjust Quick Capture settings in `Settings` -> `Task Genius` -> `Quick Capture`.

*   **Enable quick capture:** Master toggle for the inline quick capture panel feature.
*   **Target file:** The path to the Markdown file where captured items will be saved (e.g., `Inbox.md` or `Captured/Tasks.md`). The file will be created if it doesn't exist.
*   **Placeholder text:** The text displayed in the inline capture input field before you start typing.
*   **Append to file:** Choose how new captures are added to the target file:
    *   `Append`: Add to the end of the file.
    *   `Prepend`: Add to the beginning of the file.
    *   `Replace`: Overwrite the entire file content (use with caution!).

## Usage

There are several ways to use Quick Capture:

1.  **Inline Capture Panel (Editor):**
    *   **Command:** `Task Genius: Toggle quick capture panel` (Default Hotkey: `Alt+C`, but check Obsidian hotkey settings).
    *   **Action:** Opens a small input panel within the current editor. Type your task or note and press `Enter` to save it to the `Target file` according to the `Append to file` setting. Press `Escape` to cancel.
    *   *Requires `Enable quick capture` to be toggled on in settings.*

2.  **Global Capture:**
    *   **Command:** `Task Genius: Quick capture (Global)`
    *   **Action:**
        *   If your active pane is a Markdown editor, this behaves like the Inline Capture Panel.
        *   If you are not in an editor (e.g., browsing settings, graph view), this opens a simple modal window. Type your text and click "Capture" to save it to the `Target file`.

3.  **Full-Featured Capture Modal:**
    *   **Command:** `Task Genius: Task capture with metadata`
    *   **Action:** Opens a dedicated modal window designed for capturing tasks with more detail. You can typically add:
        *   Task description
        *   Due date
        *   Priority
        *   Tags
        *   Project/Context information
    *   This provides a more structured way to capture tasks compared to the basic text input methods. The captured task is saved to the `Target file`.
