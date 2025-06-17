import { parseTaskLine } from "../utils/taskUtil";
import { sortTasksInDocument } from "../commands/sortTaskCommands";
import { createMockPlugin, createMockEditorView } from "./mockUtils";

describe("Debug Emoji Parsing", () => {
	it("should parse emoji due date correctly", () => {
		const testLine = "- [ ] Task A 📅 2025-01-01";
		const parsedTask = parseTaskLine("test.md", testLine, 1, "tasks");

		expect(parsedTask).not.toBeNull();
		if (parsedTask) {
			expect(parsedTask.metadata.dueDate).toBeDefined();
			// Throw to show the debug info
			throw new Error(`Due date: ${parsedTask.metadata.dueDate}, type: ${typeof parsedTask.metadata.dueDate}`);
		}
	});

	it("should parse multiple emoji tasks", () => {
		const testLines = [
			"- [ ] Task C 📅 2025-01-03",
			"- [ ] Task A 📅 2025-01-01",
			"- [x] Completed Task B 📅 2025-01-02"
		];

		testLines.forEach((line, index) => {
			const parsedTask = parseTaskLine("test.md", line, index + 1, "tasks");
			expect(parsedTask).not.toBeNull();
			if (parsedTask) {
				expect(parsedTask.metadata.dueDate).toBeDefined();
			}
		});
	});

	it("should debug sortTasksInDocument step by step", () => {
		const originalContent = `
- [ ] Task C 📅 2025-01-03
- [ ] Task A 📅 2025-01-01
- [x] Completed Task B 📅 2025-01-02`;

		const mockView = createMockEditorView(originalContent);
		const mockPlugin = createMockPlugin({
			preferMetadataFormat: "tasks",
			sortTasks: true,
			sortCriteria: [
				{ field: "completed", order: "asc" },
				{ field: "dueDate", order: "asc" },
			],
		});

		// Check if plugin settings are correct
		expect(mockPlugin.settings.sortTasks).toBe(true);
		expect(mockPlugin.settings.sortCriteria).toHaveLength(2);
		expect(mockPlugin.settings.preferMetadataFormat).toBe("tasks");

		// Check if mock app has required methods
		expect(mockPlugin.app.workspace.getActiveFile).toBeDefined();
		expect(mockPlugin.app.metadataCache.getFileCache).toBeDefined();

		// Test parseTasksForSorting directly
		const { parseTasksForSorting } = require("../commands/sortTaskCommands");
		const blockTasks = parseTasksForSorting(
			originalContent.trim(),
			0,
			"test.md",
			"tasks"
		);

		// Should find 3 tasks
		expect(blockTasks).toHaveLength(3);

		// Check if tasks have due dates
		blockTasks.forEach((task: any, index: number) => {
			expect(task.dueDate).toBeDefined();
			// Due date should be a number (timestamp) for proper sorting
			console.log(`Task ${index}: dueDate = ${task.dueDate}, type = ${typeof task.dueDate}`);
		});

		// Test the sort function
		const result = sortTasksInDocument(mockView, mockPlugin, true);

		// The result should not be null
		expect(result).not.toBeNull();
	});
});
