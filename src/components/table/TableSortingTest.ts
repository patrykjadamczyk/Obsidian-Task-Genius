/**
 * Test utility for verifying table sorting and rendering functionality
 * This can be used to manually test the table sorting fixes
 */

import { Task } from "../../types/task";

/**
 * Create test tasks with various data types for testing sorting
 */
export function createTestTasks(): Task[] {
	const now = Date.now();
	const oneDay = 24 * 60 * 60 * 1000;

	return [
		{
			id: "task-1",
			content: "High priority task",
			status: " ",
			completed: false,
			priority: 5,
			dueDate: now + oneDay,
			tags: ["urgent", "work"],
			project: "Project Alpha",
			context: "office",
			filePath: "test.md",
			line: 1,
			createdDate: now - oneDay * 5,
		},
		{
			id: "task-2",
			content: "Completed task",
			status: "x",
			completed: true,
			priority: 3,
			dueDate: now - oneDay,
			tags: ["done"],
			project: "Project Beta",
			context: "home",
			filePath: "test.md",
			line: 2,
			createdDate: now - oneDay * 3,
		},
		{
			id: "task-3",
			content: "No priority task",
			status: " ",
			completed: false,
			priority: undefined,
			dueDate: undefined,
			tags: [],
			project: "",
			context: "",
			filePath: "test.md",
			line: 3,
			createdDate: now - oneDay * 2,
		},
		{
			id: "task-4",
			content: "In progress task",
			status: "/",
			completed: false,
			priority: 2,
			dueDate: now + oneDay * 2,
			tags: ["progress"],
			project: "Project Alpha",
			context: "office",
			filePath: "test.md",
			line: 4,
			createdDate: now - oneDay * 4,
		},
		{
			id: "task-5",
			content: "Empty content task",
			status: " ",
			completed: false,
			priority: 1,
			dueDate: now + oneDay * 3,
			tags: undefined,
			project: undefined,
			context: undefined,
			filePath: "test.md",
			line: 5,
			createdDate: now - oneDay,
		},
	] as Task[];
}

/**
 * Verify that sorting is working correctly by checking task order
 */
export function verifySorting(
	tasks: Task[],
	sortField: string,
	sortOrder: "asc" | "desc"
): boolean {
	if (tasks.length < 2) return true;

	for (let i = 0; i < tasks.length - 1; i++) {
		const current = tasks[i];
		const next = tasks[i + 1];

		const comparison = compareTasks(current, next, sortField);
		
		if (sortOrder === "asc" && comparison > 0) {
			console.error(`Sorting verification failed at index ${i}: ${current.id} should come after ${next.id}`);
			return false;
		}
		
		if (sortOrder === "desc" && comparison < 0) {
			console.error(`Sorting verification failed at index ${i}: ${current.id} should come after ${next.id}`);
			return false;
		}
	}

	return true;
}

/**
 * Compare two tasks based on a field (simplified version for testing)
 */
function compareTasks(taskA: Task, taskB: Task, field: string): number {
	const getFieldValue = (task: Task, field: string): any => {
		switch (field) {
			case "priority":
				return task.priority || 0;
			case "dueDate":
				return task.dueDate || Number.MAX_SAFE_INTEGER;
			case "content":
				return task.content || "";
			case "status":
				return task.status || "";
			case "project":
				return task.project || "";
			case "context":
				return task.context || "";
			default:
				return "";
		}
	};

	const valueA = getFieldValue(taskA, field);
	const valueB = getFieldValue(taskB, field);

	// Handle empty/null values - they should go to the end
	const aIsEmpty = valueA === "" || valueA === null || valueA === undefined || valueA === 0;
	const bIsEmpty = valueB === "" || valueB === null || valueB === undefined || valueB === 0;

	if (aIsEmpty && bIsEmpty) return 0;
	if (aIsEmpty) return 1; // A is empty, goes to end
	if (bIsEmpty) return -1; // B is empty, goes to end

	// Normal comparison
	if (typeof valueA === "string" && typeof valueB === "string") {
		return valueA.localeCompare(valueB);
	}

	if (typeof valueA === "number" && typeof valueB === "number") {
		return valueA - valueB;
	}

	return 0;
}

/**
 * Log test results for debugging
 */
export function logTestResults(tasks: Task[], sortField: string, sortOrder: "asc" | "desc") {
	console.log(`\n=== Table Sorting Test Results ===`);
	console.log(`Sort Field: ${sortField}`);
	console.log(`Sort Order: ${sortOrder}`);
	console.log(`Task Count: ${tasks.length}`);
	
	console.log(`\nTask Order:`);
	tasks.forEach((task, index) => {
		const fieldValue = (task as any)[sortField];
		console.log(`${index + 1}. ${task.id}: ${fieldValue} (${task.content})`);
	});

	const isValid = verifySorting(tasks, sortField, sortOrder);
	console.log(`\nSorting Valid: ${isValid ? "✅ PASS" : "❌ FAIL"}`);
	
	return isValid;
}
