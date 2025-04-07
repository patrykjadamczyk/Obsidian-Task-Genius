/**
 * Web worker for background processing of task indexing
 */

import { FileStats } from "obsidian";
import { Task } from "../types/TaskIndex";

/** Command to parse task from a file */
export interface ParseTasksCommand {
	type: "parseTasks";
	filePath: string;
	content: string;
	stats: FileStats;
}

/** Command to batch index multiple files */
export interface BatchIndexCommand {
	type: "batchIndex";
	files: {
		path: string;
		content: string;
		stats: FileStats;
	}[];
}

/** Available commands that can be sent to the worker */
export type IndexerCommand = ParseTasksCommand | BatchIndexCommand;

/** Result of task parsing */
export interface TaskParseResult {
	type: "parseResult";
	filePath: string;
	tasks: Task[];
	stats: {
		totalTasks: number;
		completedTasks: number;
		processingTimeMs: number;
	};
}

/** Result of batch indexing */
export interface BatchIndexResult {
	type: "batchResult";
	results: {
		filePath: string;
		taskCount: number;
	}[];
	stats: {
		totalFiles: number;
		totalTasks: number;
		processingTimeMs: number;
	};
}

/** Result of a worker operation or error */
export type IndexerResult = TaskParseResult | BatchIndexResult | ErrorResult;

/** Error response */
export interface ErrorResult {
	type: "error";
	error: string;
	filePath?: string;
}

/**
 * Regular expressions for parsing task components
 */
const TASK_REGEX = /^([\s>]*- \[(.)\])\s*(.*)$/m;
const START_DATE_REGEX = /📅 (\d{4}-\d{2}-\d{2})/;
const COMPLETED_DATE_REGEX = /✅ (\d{4}-\d{2}-\d{2})/;
const DUE_DATE_REGEX = /⏳ (\d{4}-\d{2}-\d{2})/;
const SCHEDULED_DATE_REGEX = /⏰ (\d{4}-\d{2}-\d{2})/;
const RECURRENCE_REGEX = /🔁 (.*?)(?=\s|$)/;
const TAG_REGEX = /#[\w\/-]+/g;
const CONTEXT_REGEX = /@[\w-]+/g;
const PRIORITY_REGEX = /🔼|⏫|🔽|⏬️|🔺|\[#[A-C]\]/;
const PRIORITY_MAP: Record<string, number> = {
	"⏫": 3, // High
	"🔼": 2, // Medium
	"🔽": 1, // Low
	"⏬️": 1, // Lowest
	"🔺": 5, // Highest
	"[#A]": 4, // High (letter format)
	"[#B]": 3, // Medium (letter format)
	"[#C]": 2, // Low (letter format)
};

/**
 * Parse tasks from file content
 */
function parseTasksFromContent(filePath: string, content: string): Task[] {
	const lines = content.split(/\r?\n/);
	const tasks: Task[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const taskMatch = line.match(TASK_REGEX);

		if (taskMatch) {
			const [, prefix, status, content] = taskMatch;
			const completed = status.toLowerCase() === "x";

			// Generate a deterministic ID based on file path and line number
			// This helps with task tracking across worker calls
			const id = `${filePath}-L${i}`;

			// Basic task info
			const task: Task = {
				id,
				content: content.trim(),
				filePath,
				line: i,
				completed,
				originalMarkdown: line,
				tags: [],
				children: [],
			};

			// Extract metadata
			extractDates(task, content);
			extractTags(task, content);
			extractContext(task, content);
			extractPriority(task, content);

			tasks.push(task);
		}
	}

	// Build parent-child relationships
	buildTaskHierarchy(tasks);

	return tasks;
}

/**
 * Extract dates from task content
 */
function extractDates(task: Task, content: string): void {
	// Start date
	const startDateMatch = content.match(START_DATE_REGEX);
	if (startDateMatch) {
		task.startDate = new Date(startDateMatch[1]).getTime();
	}

	// Due date
	const dueDateMatch = content.match(DUE_DATE_REGEX);
	if (dueDateMatch) {
		task.dueDate = new Date(dueDateMatch[1]).getTime();
	}

	// Scheduled date
	const scheduledDateMatch = content.match(SCHEDULED_DATE_REGEX);
	if (scheduledDateMatch) {
		task.scheduledDate = new Date(scheduledDateMatch[1]).getTime();
	}

	// Completion date
	const completedDateMatch = content.match(COMPLETED_DATE_REGEX);
	if (completedDateMatch) {
		task.completedDate = new Date(completedDateMatch[1]).getTime();
	}
}

/**
 * Extract tags from task content
 */
function extractTags(task: Task, content: string): void {
	const tagMatches = content.match(TAG_REGEX) || [];
	task.tags = tagMatches.map((tag) => tag.trim());

	// Check for project tags
	const projectTag = task.tags.find((tag) => tag.startsWith("#project/"));
	if (projectTag) {
		task.project = projectTag.substring("#project/".length);
	}
}

/**
 * Extract context from task content
 */
function extractContext(task: Task, content: string): void {
	const contextMatches = content.match(CONTEXT_REGEX) || [];
	if (contextMatches.length > 0) {
		// Use the first context tag as the primary context
		task.context = contextMatches[0]?.substring(1); // Remove the @ symbol
	}
}

/**
 * Extract priority from task content
 */
function extractPriority(task: Task, content: string): void {
	const priorityMatch = content.match(PRIORITY_REGEX);
	if (priorityMatch) {
		task.priority = PRIORITY_MAP[priorityMatch[0]] || undefined;
	}
}

/**
 * Build parent-child relationships between tasks
 */
function buildTaskHierarchy(tasks: Task[]): void {
	// Sort tasks by line number
	tasks.sort((a, b) => a.line - b.line);

	// Build parent-child relationships based on indentation
	for (let i = 0; i < tasks.length; i++) {
		const currentTask = tasks[i];
		const currentIndent = getIndentLevel(currentTask.originalMarkdown);

		// Look for potential parent tasks (must be before current task and have less indentation)
		for (let j = i - 1; j >= 0; j--) {
			const potentialParent = tasks[j];
			const parentIndent = getIndentLevel(
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
function getIndentLevel(line: string): number {
	const match = line.match(/^(\s*)/);
	return match ? match[1].length : 0;
}

/**
 * Process a single file
 */
function processFile(
	filePath: string,
	content: string,
	stats: FileStats
): TaskParseResult {
	const startTime = performance.now();

	try {
		const tasks = parseTasksFromContent(filePath, content);
		const completedTasks = tasks.filter((t) => t.completed).length;

		return {
			type: "parseResult",
			filePath,
			tasks,
			stats: {
				totalTasks: tasks.length,
				completedTasks,
				processingTimeMs: Math.round(performance.now() - startTime),
			},
		};
	} catch (error) {
		console.error(`Error processing file ${filePath}:`, error);
		throw error;
	}
}

/**
 * Process multiple files in batch
 */
function processBatch(
	files: { path: string; content: string; stats: FileStats }[]
): BatchIndexResult {
	const startTime = performance.now();
	const results: { filePath: string; taskCount: number }[] = [];
	let totalTasks = 0;

	for (const file of files) {
		try {
			const parseResult = processFile(
				file.path,
				file.content,
				file.stats
			);
			totalTasks += parseResult.stats.totalTasks;
			results.push({
				filePath: file.path,
				taskCount: parseResult.stats.totalTasks,
			});
		} catch (error) {
			console.error(
				`Error in batch processing for file ${file.path}:`,
				error
			);
			// Continue with other files even if one fails
		}
	}

	return {
		type: "batchResult",
		results,
		stats: {
			totalFiles: files.length,
			totalTasks,
			processingTimeMs: Math.round(performance.now() - startTime),
		},
	};
}

/**
 * Web worker message handler
 */
self.onmessage = async (event) => {
	try {
		const message = event.data as IndexerCommand;

		if (message.type === "parseTasks") {
			const result = processFile(
				message.filePath,
				message.content,
				message.stats
			);
			self.postMessage(result);
		} else if (message.type === "batchIndex") {
			const result = processBatch(message.files);
			self.postMessage(result);
		} else {
			self.postMessage({
				type: "error",
				error: `Unknown command type: ${(message as any).type}`,
			} as ErrorResult);
		}
	} catch (error) {
		self.postMessage({
			type: "error",
			error: error instanceof Error ? error.message : String(error),
		} as ErrorResult);
	}
};
