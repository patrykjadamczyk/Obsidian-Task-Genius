/**
 * Extract the text content of a task from a markdown line
 * 
 * @param lineText The full text of the markdown line containing the task
 * @return The extracted task text or null if no task was found
 */

function extractTaskText(lineText: string): string | null {
    if (!lineText) return null;

    const taskTextMatch = lineText.match(/^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]\s*(.*?)$/);
    if (taskTextMatch && taskTextMatch[3]) {
        return taskTextMatch[3].trim();
    }

    return null;
}

/**
 * Extract the goal value from a task text
 * Supports only g::number or goal::number format
 * 
 * @param taskText The task text to extract the goal from
 * @return The extracted goal value or null if no goal found
 */

function extractTaskSpecificGoal(taskText: string): number | null {
    if (!taskText) return null;

    // Match only the patterns g::number or goal::number
    const goalMatch = taskText.match(/\b(g|goal)::(\d+)\b/i);
    if (!goalMatch) return null;

    return Number(goalMatch[2]);
}

/**
 * Extract task text and goal information from a line
 * 
 * @param lineText The full text of the markdown line containing the task
 * @return The extracted goal value or null if no goal found
 */
export function extractTaskAndGoalInfo(lineText: string | null): number | null {
    if (!lineText) return null;

    // Extract task text
    const taskText = extractTaskText(lineText);
    if (!taskText) return null;

    // Check for goal in g::number or goal::number format
    return extractTaskSpecificGoal(taskText);
}