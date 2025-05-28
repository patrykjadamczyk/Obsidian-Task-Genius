/**
 * Optimized task parser focused on task data only
 */

import {
	CachedMetadata,
	Component,
	FileStats,
	ListItemCache,
	TFile,
} from "obsidian";
import { Task, TaskParserConfig } from "../../types/task";
import { MetadataFormat, parseTaskLine } from "../taskUtil";

/**
 * Default configuration for the task parser
 */
export const DEFAULT_TASK_PARSER_CONFIG: TaskParserConfig = {
	taskRegex: /^(([\s>]*)?(-|\d+\.|\*|\+)\s\[(.)\])\s*(.*)$/m,
	startDateFormat: "📅 YYYY-MM-DD",
	dueDateFormat: "⏳ YYYY-MM-DD",
	scheduledDateFormat: "⏰ YYYY-MM-DD",
	projectPrefix: "#project/",
	contextPrefix: "@",
	priorityMarkers: {
		"🔺": 5, // Highest
		"⏫": 4, // High
		"🔼": 3, // Medium
		"🔽": 2, // Low
		"⏬️": 1, // Lowest
		"[#A]": 4, // High (letter format)
		"[#B]": 3, // Medium (letter format)
		"[#C]": 2, // Low (letter format)
		highest: 5,
		high: 4,
		medium: 3,
		low: 2,
		lowest: 1,
		a: 4,
		b: 3,
		c: 2,
	},
	preferMetadataFormat: "tasks",
};

export class TaskParser extends Component {
	private config: TaskParserConfig;

	constructor(config: Partial<TaskParserConfig> = {}) {
		super();
		this.config = { ...DEFAULT_TASK_PARSER_CONFIG, ...config };
		if (config.priorityMarkers) {
			this.config.priorityMarkers = {
				...DEFAULT_TASK_PARSER_CONFIG.priorityMarkers,
				...config.priorityMarkers,
			};
		}
	}

	/**
	 * Parse a task from a text line and list item metadata
	 */
	parseTask(
		text: string,
		filePath: string,
		lineNum: number,
		listItem?: ListItemCache
	): Task | null {
		const taskIdentifierMatch = text.match(this.config.taskRegex);
		if (!taskIdentifierMatch) return null;

		const status = listItem?.task ?? taskIdentifierMatch[4];
		if (status === undefined) return null;

		const task = parseTaskLine(
			filePath,
			text,
			lineNum,
			this.config.preferMetadataFormat as MetadataFormat
		);

		return task;
	}

	/**
	 * Parse all tasks from a file
	 */
	async parseTasksFromFile(
		file: TFile,
		fileContent: string,
		metadata?: CachedMetadata
	): Promise<Task[]> {
		const lines = fileContent.split("\n");
		const tasks: Task[] = [];
		const tasksByLine: Record<number, Task> = {};

		if (metadata?.listItems && metadata.listItems.length > 0) {
			const taskListItems = metadata.listItems.filter(
				(item) => item.task !== undefined
			);

			for (const listItem of taskListItems) {
				const lineNum = listItem.position.start.line;
				if (lineNum >= 0 && lineNum < lines.length) {
					const line = lines[lineNum];
					try {
						const task = this.parseTask(
							line,
							file.path,
							lineNum,
							listItem
						);
						if (task) {
							tasks.push(task);
							tasksByLine[lineNum] = task;
						}
					} catch (error) {
						console.error(
							`Error parsing task at line ${lineNum} in file ${file.path}:`,
							error,
							`Line: "${line}"`,
							listItem
						);
					}
				}
			}

			for (const listItem of taskListItems) {
				const lineNum = listItem.position.start.line;
				const task = tasksByLine[lineNum];
				if (task && listItem.parent >= 0) {
					const parentTask = tasksByLine[listItem.parent];
					if (parentTask) {
						task.parent = parentTask.id;
						if (!parentTask.children) {
							parentTask.children = [];
						}
						parentTask.children.push(task.id);
					}
				}
			}
		} else {
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				try {
					const task = this.parseTask(line, file.path, i);
					if (task) {
						tasks.push(task);
						tasksByLine[i] = task;
					}
				} catch (error) {
					console.error(
						`Error parsing task at line ${i} in file ${file.path}:`,
						error,
						`Line: "${line}"`
					);
				}
			}

			this.buildTaskHierarchyByIndent(tasks);
		}

		return tasks;
	}

	private buildTaskHierarchyByIndent(tasks: Task[]): void {
		tasks.sort((a, b) => a.line - b.line);
		const taskStack: { task: Task; indent: number }[] = [];

		for (const currentTask of tasks) {
			const currentIndent = this.getIndentLevel(
				currentTask.originalMarkdown
			);

			while (
				taskStack.length > 0 &&
				taskStack[taskStack.length - 1].indent >= currentIndent
			) {
				taskStack.pop();
			}

			if (taskStack.length > 0) {
				const parentTask = taskStack[taskStack.length - 1].task;
				currentTask.parent = parentTask.id;
				if (!parentTask.children) {
					parentTask.children = [];
				}
				parentTask.children.push(currentTask.id);
			}

			taskStack.push({ task: currentTask, indent: currentIndent });
		}
	}

	private getIndentLevel(line: string): number {
		const match = line.match(/^(\s*)/);
		return match ? match[1].length : 0;
	}
}
