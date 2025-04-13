# Date & Priority Management

Task Genius provides tools to easily add and manage due dates and priorities for your tasks directly within the editor.

## Date Picker

Update the date of a task by clicking on the date text in the task line.

*   **Configuration:** (`Settings` -> `Task Genius` -> `Date & Priority`)
    *   **Enable date picker:** Toggle this on to show a calendar icon (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-calendar-days"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>) next to tasks in the editor.
    *   **Date mark:** Define the emoji marker(s) used to signify a date (e.g., `📅`). You can use multiple markers separated by commas.
*   **Usage:**
    *   The date format like `📅 2023-12-25` will be converted to clickable elements in the editor, allowing you to quickly modify dates by clicking on them.
    *   Click the calendar icon and date text (for example `📅 2023-12-25`) in task line.
    *   A date picker popup will appear. Select a date.
    *   The plugin will update the date text (formatted as YYYY-MM-DD) to the selected date.

## Priority Picker

Assign priority levels to your tasks using emojis or letters.

*   **Configuration:** (`Settings` -> `Task Genius` -> `Date & Priority`)
    *   **Enable priority picker:** Toggle this on to enable interactive priority setting via dropdowns and context menus.
    *   **Enable priority keyboard shortcuts:** Enable commands and hotkeys for setting priorities.
*   **Supported Priorities:**
    *   **Emoji:** 🔺 (Highest), ⏫ (High), 🔼 (Medium), 🔽 (Low), ⏬️ (Lowest)
    *   **Letter:** `[#A]`, `[#B]`, `[#C]` (Often used in task management methodologies)
*   **Usage:**
    *   **Dropdown (Live Preview/Reading):** If a task already has a recognized priority marker, clicking on that marker might show a dropdown menu to select a different priority. (Requires `Enable priority picker`)
    *   **Context Menu:** Right-click on a task line -> `Set priority` -> Choose the desired priority level. (Requires `Enable priority picker`)
    *   **Commands/Shortcuts:** (Requires `Enable priority keyboard shortcuts`)
        *   Use commands like `Task Genius: Set priority Highest` or `Task Genius: Set priority A`. Assign hotkeys to these commands in Obsidian's settings for faster access.
        *   Use the command `Task Genius: Remove priority` to remove any existing priority marker from the task line.
