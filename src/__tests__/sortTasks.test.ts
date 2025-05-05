import { sortTasksInDocument } from "../commands/sortTaskCommands";
import {
	createMockText,
	createMockPlugin,
	createMockEditorView,
} from "./mockUtils";

describe("sortTasksInDocument", () => {
	// Reset Notice mock after each test
	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should identify and sort tasks", () => {
		// Original content: mixed task order
		const originalContent = `
- [ ] Incomplete task 1
- [x] Completed task
- [/] In progress task`;

		// Create mock EditorView and plugin
		const mockView = createMockEditorView(originalContent);
		const mockPlugin = createMockPlugin({
			sortTasks: true,
			sortCriteria: [{ field: "status", order: "asc" }],
		});

		const result = sortTasksInDocument(mockView, mockPlugin, true);

		// Expected result: text sorted by status
		const expectedContent = `
- [ ] Incomplete task 1
- [/] In progress task
- [x] Completed task`;

		// Verify sort result
		expect(result).toEqual(expectedContent);
	});

	it("should place completed tasks at the end regardless of sort criteria", () => {
		// Original content: mixed task order
		const originalContent = `
- [x] Completed task 1
- [ ] Incomplete task [priority:: high] [due:: 2025-05-01]
- [/] In progress task [start:: 2025-04-01]
- [x] Completed task 2`;

		// Create mock EditorView and plugin
		const mockView = createMockEditorView(originalContent);
		const mockPlugin = createMockPlugin({
			sortTasks: true,
			sortCriteria: [{ field: "priority", order: "asc" }],
		});

		// Call sort function
		const result = sortTasksInDocument(mockView, mockPlugin, true);

		// Expected result: incomplete tasks sorted by priority, but completed tasks always at the end
		const expectedContent = `
- [ ] Incomplete task [priority:: high] [due:: 2025-05-01]
- [/] In progress task [start:: 2025-04-01]
- [x] Completed task 1
- [x] Completed task 2`;

		// Verify sort result
		expect(result).toEqual(expectedContent);
	});

	it("should maintain relative position of non-contiguous task blocks", () => {
		// Original content: two task blocks separated by non-task lines
		const originalContent = `
First task block:
- [x] Completed task 1
- [ ] Incomplete task 1

Middle non-task content

Second task block:
- [x] Completed task 2
- [ ] Incomplete task 2`;

		// Create mock EditorView and plugin
		const mockView = createMockEditorView(originalContent);
		const mockPlugin = createMockPlugin({
			sortTasks: true,
			sortCriteria: [{ field: "status", order: "asc" }],
		});

		// Call sort function
		const result = sortTasksInDocument(mockView, mockPlugin, true);

		// Expected result: each block sorted internally, but blocks maintain relative position
		const expectedContent = `
First task block:
- [ ] Incomplete task 1
- [x] Completed task 1

Middle non-task content

Second task block:
- [ ] Incomplete task 2
- [x] Completed task 2`;

		// Verify sort result
		expect(result).toEqual(expectedContent);
	});

	it("should preserve task hierarchy (parent-child relationships)", () => {
		// Original content: tasks with parent-child relationships
		const originalContent = `
- [x] Parent task 1
  - [ ] Child task 1
  - [/] Child task 2
- [ ] Parent task 2
  - [x] Child task 3`;

		// Create mock EditorView and plugin
		const mockView = createMockEditorView(originalContent);
		const mockPlugin = createMockPlugin({
			sortTasks: true,
			sortCriteria: [{ field: "status", order: "asc" }],
		});

		// Call sort function
		const result = sortTasksInDocument(mockView, mockPlugin, true);

		// Expected result: parent tasks sorted, child tasks follow their respective parents
		const expectedContent = `
- [ ] Parent task 2
  - [x] Child task 3
- [x] Parent task 1
  - [ ] Child task 1
  - [/] Child task 2`;

		// Verify sort result
		expect(result).toEqual(expectedContent);
	});

	it("should sort tasks by multiple criteria", () => {
		// Original content: tasks with various metadata
		const originalContent = `
- [ ] Low priority [priority:: low] [due:: 2025-05-01]
- [ ] High priority [priority:: high]
- [ ] Medium priority with due date [priority:: medium] [due:: 2025-04-01]
- [ ] Medium priority with later due date [priority:: medium] [due:: 2025-06-01]`;

		// Create mock EditorView and plugin
		const mockView = createMockEditorView(originalContent);
		const mockPlugin = createMockPlugin({
			preferMetadataFormat: "dataview",
			sortTasks: true,
			sortCriteria: [
				{ field: "priority", order: "asc" },
				{ field: "dueDate", order: "asc" },
			],
		});

		// Call sort function
		const result = sortTasksInDocument(mockView, mockPlugin, true);

		// Expected result: sorted first by priority (high->medium->low), then by due date (early->late)
		const expectedContent = `
- [ ] High priority [priority:: high]
- [ ] Medium priority with due date [priority:: medium] [due:: 2025-04-01]
- [ ] Medium priority with later due date [priority:: medium] [due:: 2025-06-01]
- [ ] Low priority [priority:: low] [due:: 2025-05-01]`;

		// Verify sort result
		expect(result).toEqual(expectedContent);
	});

	it("should return null when there are no tasks to sort", () => {
		// Original content: no tasks
		const originalContent = `
This is a document with no tasks
Just regular text content`;

		// Create mock EditorView and plugin
		const mockView = createMockEditorView(originalContent);
		const mockPlugin = createMockPlugin({
			sortTasks: true,
			sortCriteria: [{ field: "status", order: "asc" }],
		});

		// Call sort function
		const result = sortTasksInDocument(mockView, mockPlugin, true);

		// Verify result is null
		expect(result).toBeNull();
	});

	it("should correctly sort tasks with dataview inline fields", () => {
		// Original content: tasks with dataview inline fields
		const originalContent = `
- [ ] Task B [priority:: low]
- [ ] Task A [priority:: high]
- [x] Completed Task C`;

		// Create mock EditorView and plugin with dataview enabled
		const mockView = createMockEditorView(originalContent);
		const mockPlugin = createMockPlugin({
			preferMetadataFormat: "dataview",
			sortTasks: true,
			sortCriteria: [{ field: "priority", order: "asc" }],
		});

		// Call sort function
		const result = sortTasksInDocument(mockView, mockPlugin, true);

		// Expected result: sorted by priority, completed task at the end
		const expectedContent = `
- [ ] Task A [priority:: high]
- [ ] Task B [priority:: low]
- [x] Completed Task C`;

		// Verify sort result
		expect(result).toEqual(expectedContent);
	});

	it("should correctly sort tasks with Tasks plugin emojis", () => {
		// Original content: tasks with Tasks plugin emojis
		const originalContent = `
- [ ] Task C 📅 2025-01-03
- [ ] Task A 📅 2025-01-01
- [x] Completed Task B 📅 2025-01-02`;

		// Create mock EditorView and plugin with tasks plugin enabled
		const mockView = createMockEditorView(originalContent);
		const mockPlugin = createMockPlugin({
			preferMetadataFormat: "tasks",
			sortTasks: true,
			sortCriteria: [{ field: "dueDate", order: "asc" }],
		});

		// Call sort function
		const result = sortTasksInDocument(mockView, mockPlugin, true);

		// Expected result: sorted by due date, completed task at the end
		const expectedContent = `
- [ ] Task A 📅 2025-01-01
- [ ] Task C 📅 2025-01-03
- [x] Completed Task B 📅 2025-01-02`;

		// Verify sort result
		expect(result).toEqual(expectedContent);
	});
});
