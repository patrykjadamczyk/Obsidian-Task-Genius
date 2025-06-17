/**
 * Test file to verify subtask metadata inheritance behavior
 */

import { ConfigurableTaskParser } from "../utils/workers/ConfigurableTaskParser";
import { TaskParserConfig } from "../types/TaskParserConfig";
import { MetadataParseMode } from "../common/setting-definition";

describe("Subtask Metadata Inheritance", () => {
	let parser: ConfigurableTaskParser;
	let config: TaskParserConfig;

	beforeEach(() => {
		config = {
			parseComments: true,
			parseMetadata: true,
			parseTags: true,
			metadataParseMode: MetadataParseMode.Both,
			maxMetadataIterations: 10,
			emojiMapping: {
				"📅": "dueDate",
				"🔺": "priority",
			},
			specialTagPrefixes: {
				due: "dueDate",
				priority: "priority",
			},
			statusMapping: {},
			projectConfig: {
				enableEnhancedProject: true,
				pathMappings: [],
				metadataConfig: {
					metadataKey: "project",
					inheritFromFrontmatter: true,
					inheritFromFrontmatterForSubtasks: false, // Default: disabled
					enabled: true,
				},
				configFile: {
					fileName: "project.md",
					searchRecursively: true,
					enabled: false,
				},
			},
		};

		parser = new ConfigurableTaskParser(config);
	});

	it("should inherit file metadata for top-level tasks when inheritance is enabled", () => {
		const content = `
- [ ] Top level task
	- [ ] Subtask 1
		- [ ] Sub-subtask
`;

		const fileMetadata = {
			project: "Test Project",
			priority: "high",
			category: "work",
		};

		const tasks = parser.parse(content, "test.md", fileMetadata);

		expect(tasks).toHaveLength(3);

		// Top-level task should inherit file metadata
		const topLevelTask = tasks[0];
		expect(topLevelTask.metadata.project).toBe("Test Project");
		expect(topLevelTask.metadata.priority).toBe("4"); // "high" converted to number
		expect(topLevelTask.metadata.category).toBe("work");

		// Subtasks should NOT inherit file metadata (default behavior)
		const subtask = tasks[1];
		expect(subtask.metadata.project).toBeUndefined();
		expect(subtask.metadata.priority).toBeUndefined();
		expect(subtask.metadata.category).toBeUndefined();

		const subSubtask = tasks[2];
		expect(subSubtask.metadata.project).toBeUndefined();
		expect(subSubtask.metadata.priority).toBeUndefined();
		expect(subSubtask.metadata.category).toBeUndefined();
	});

	it("should inherit file metadata for subtasks when explicitly enabled", () => {
		// Enable subtask inheritance
		config.projectConfig!.metadataConfig.inheritFromFrontmatterForSubtasks =
			true;
		parser = new ConfigurableTaskParser(config);

		const content = `
- [ ] Top level task
	- [ ] Subtask 1
		- [ ] Sub-subtask
`;

		const fileMetadata = {
			project: "Test Project",
			priority: "high",
			category: "work",
		};

		const tasks = parser.parse(content, "test.md", fileMetadata);

		expect(tasks).toHaveLength(3);

		// All tasks should inherit file metadata when enabled
		tasks.forEach((task, index) => {
			expect(task.metadata.project).toBe("Test Project");
			expect(task.metadata.priority).toBe("4"); // "high" converted to number
			expect(task.metadata.category).toBe("work");
		});
	});

	it("should not inherit file metadata when inheritance is disabled", () => {
		// Disable all inheritance
		config.projectConfig!.metadataConfig.inheritFromFrontmatter = false;
		parser = new ConfigurableTaskParser(config);

		const content = `
- [ ] Top level task
	- [ ] Subtask 1
`;

		const fileMetadata = {
			project: "Test Project",
			priority: "high",
		};

		const tasks = parser.parse(content, "test.md", fileMetadata);

		expect(tasks).toHaveLength(2);

		// No tasks should inherit file metadata when disabled
		tasks.forEach((task) => {
			expect(task.metadata.project).toBeUndefined();
			expect(task.metadata.priority).toBeUndefined();
		});
	});

	it("should preserve task-specific metadata regardless of inheritance settings", () => {
		const content = `
- [ ] Top level task [project::Task Project] 🔺 medium
	- [ ] Subtask with metadata [priority::urgent]
`;

		const fileMetadata = {
			project: "File Project",
			priority: "low",
			category: "work",
		};

		const tasks = parser.parse(content, "test.md", fileMetadata);

		expect(tasks).toHaveLength(2);

		// Top-level task should use its own metadata, not inherit from file
		const topLevelTask = tasks[0];
		expect(topLevelTask.metadata.project).toBe("Task Project"); // Task-specific
		expect(topLevelTask.metadata.priority).toBe("3"); // "medium" from emoji
		expect(topLevelTask.metadata.category).toBe("work"); // Inherited from file

		// Subtask should use its own metadata and not inherit from file (default behavior)
		const subtask = tasks[1];
		expect(subtask.metadata.priority).toBe("5"); // "urgent" from task metadata
		expect(subtask.metadata.project).toBeUndefined(); // Not inherited
		expect(subtask.metadata.category).toBeUndefined(); // Not inherited
	});
});
