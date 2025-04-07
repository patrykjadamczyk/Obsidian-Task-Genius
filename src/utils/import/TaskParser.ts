/**
 * Optimized task parser focused on task data only
 */

import { CachedMetadata, FileStats, TFile } from "obsidian";
import { Task, TaskParserConfig } from "../types/TaskIndex";
import { v4 as uuidv4 } from "uuid";

/**
 * Default configuration for the task parser
 */
export const DEFAULT_TASK_PARSER_CONFIG: TaskParserConfig = {
	taskRegex: /^([\s>]*- \[(.)\])\s*(.*)$/m,
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
	},
};

export class TaskParser {
	// Regular expressions for parsing task components
	private readonly startDateRegex = /📅 (\d{4}-\d{2}-\d{2})/;
	private readonly completedDateRegex = /✅ (\d{4}-\d{2}-\d{2})/;
	private readonly dueDateRegex = /⏳ (\d{4}-\d{2}-\d{2})/;
	private readonly scheduledDateRegex = /⏰ (\d{4}-\d{2}-\d{2})/;
	private readonly recurrenceRegex = /🔁 (.*?)(?=\s|$)/;
	private readonly tagRegex = /#[\w\/-]+/g;
	private readonly contextRegex = /@[\w-]+/g;
	private readonly priorityRegex = /🔼|⏫|🔽|⏬️|🔺|\[#[A-C]\]/;
	private readonly estimatedTimeRegex = /estimated:\s*(\d+)([hm])/i;

	private config: TaskParserConfig;

	constructor(config: Partial<TaskParserConfig> = {}) {
		this.config = { ...DEFAULT_TASK_PARSER_CONFIG, ...config };
	}

	/**
	 * Parse a task from a text line
	 */
	parseTask(text: string, filePath: string, lineNum: number): Task | null {
		const match = text.match(this.config.taskRegex);
		if (!match) return null;

		const [, prefix, status, content] = match;
		const completed = status.toLowerCase() === "x";

		// Basic task info
		const task: Task = {
			id: uuidv4(),
			content: content.trim(),
			filePath,
			line: lineNum,
			completed,
			originalMarkdown: text,
			tags: [],
			children: [],
		};

		// Extract metadata
		this.extractDates(task, content);
		this.extractTags(task, content);
		this.extractContext(task, content);
		this.extractPriority(task, content);
		this.extractEstimatedTime(task, content);
		this.extractRecurrence(task, content);

		return task;
	}

	/**
	 * Extract dates from task content
	 */
	private extractDates(task: Task, content: string): void {
		// Start date
		const startDateMatch = content.match(this.startDateRegex);
		if (startDateMatch) {
			task.startDate = new Date(startDateMatch[1]).getTime();
		}

		// Due date
		const dueDateMatch = content.match(this.dueDateRegex);
		if (dueDateMatch) {
			task.dueDate = new Date(dueDateMatch[1]).getTime();
		}

		// Scheduled date
		const scheduledDateMatch = content.match(this.scheduledDateRegex);
		if (scheduledDateMatch) {
			task.scheduledDate = new Date(scheduledDateMatch[1]).getTime();
		}

		// Completion date
		const completedDateMatch = content.match(this.completedDateRegex);
		if (completedDateMatch) {
			task.completedDate = new Date(completedDateMatch[1]).getTime();
		}
	}

	/**
	 * Extract tags from task content
	 */
	private extractTags(task: Task, content: string): void {
		const tagMatches = content.match(this.tagRegex) || [];
		task.tags = tagMatches.map((tag) => tag.trim());

		// Check for project tags
		const projectTag = task.tags.find((tag) =>
			tag.startsWith(this.config.projectPrefix!)
		);
		if (projectTag) {
			task.project = projectTag.substring(
				this.config.projectPrefix!.length
			);
		}
	}

	/**
	 * Extract context from task content
	 */
	private extractContext(task: Task, content: string): void {
		const contextMatches = content.match(this.contextRegex) || [];
		if (contextMatches.length > 0) {
			// Use the first context tag as the primary context
			task.context = contextMatches[0]?.substring(1); // Remove the @ symbol
		}
	}

	/**
	 * Extract priority from task content
	 */
	private extractPriority(task: Task, content: string): void {
		const priorityMatch = content.match(this.priorityRegex);
		if (priorityMatch && this.config.priorityMarkers) {
			task.priority =
				this.config.priorityMarkers[priorityMatch[0]] || undefined;
		}
	}

	/**
	 * Extract estimated time from task content
	 */
	private extractEstimatedTime(task: Task, content: string): void {
		const timeMatch = content.match(this.estimatedTimeRegex);
		if (timeMatch) {
			const value = parseInt(timeMatch[1]);
			const unit = timeMatch[2].toLowerCase();

			if (unit === "h") {
				task.estimatedTime = value * 60; // Convert hours to minutes
			} else {
				task.estimatedTime = value; // Already in minutes
			}
		}
	}

	/**
	 * Extract recurrence information from task content
	 */
	private extractRecurrence(task: Task, content: string): void {
		const recurrenceMatch = content.match(this.recurrenceRegex);
		if (recurrenceMatch) {
			task.recurrence = recurrenceMatch[1];
		}
	}

	/**
	 * Generate markdown text from a task object
	 */
	generateMarkdown(task: Task): string {
		let markdown = `- [${task.completed ? "x" : " "}] ${task.content}`;

		// This is simplified - a full implementation would reconstruct the original
		// markdown with all the metadata in the correct format

		return markdown;
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

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const task = this.parseTask(line, file.path, i);

			if (task) {
				tasks.push(task);
			}
		}

		// Build parent-child relationships
		this.buildTaskHierarchy(tasks);

		return tasks;
	}

	/**
	 * Build parent-child relationships between tasks
	 */
	private buildTaskHierarchy(tasks: Task[]): void {
		// This is a simple indent-based approach
		// A more sophisticated implementation would use Obsidian's list item metadata

		// Sort tasks by line number
		tasks.sort((a, b) => a.line - b.line);

		// Build parent-child relationships based on indentation
		for (let i = 0; i < tasks.length; i++) {
			const currentTask = tasks[i];
			const currentIndent = this.getIndentLevel(
				currentTask.originalMarkdown
			);

			// Look for potential parent tasks (must be before current task and have less indentation)
			for (let j = i - 1; j >= 0; j--) {
				const potentialParent = tasks[j];
				const parentIndent = this.getIndentLevel(
					potentialParent.originalMarkdown
				);

				if (parentIndent < currentIndent) {
					// Found a parent
					currentTask.parent = potentialParent.id;
					potentialParent.children.push(currentTask.id);
					break;
				}
			}
		}
	}

	/**
	 * Get indentation level of a line
	 */
	private getIndentLevel(line: string): number {
		const match = line.match(/^(\s*)/);
		return match ? match[1].length : 0;
	}
}
