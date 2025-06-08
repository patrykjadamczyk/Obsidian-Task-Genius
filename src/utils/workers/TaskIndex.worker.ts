/**
 * Web worker for background processing of task indexing
 * Enhanced with configurable task parser
 */

import { FileStats } from "obsidian"; // Assuming ListItemCache is not directly available/serializable to worker, rely on regex
import { Task } from "../../types/task"; // Task type definition needed
import {
	// Assume these types are defined and exported from TaskIndexWorkerMessage.ts
	// Need to add preferMetadataFormat to IndexerCommand payloads where relevant
	IndexerCommand,
	TaskParseResult,
	ErrorResult,
	BatchIndexResult,
	TaskWorkerSettings, // Keep if batch processing is still used
} from "./TaskIndexWorkerMessage";
import { parse } from "date-fns/parse";
import { parseLocalDate } from "../dateUtil";
import {
	TASK_REGEX,
	EMOJI_START_DATE_REGEX,
	EMOJI_COMPLETED_DATE_REGEX,
	EMOJI_DUE_DATE_REGEX,
	EMOJI_SCHEDULED_DATE_REGEX,
	EMOJI_CREATED_DATE_REGEX,
	EMOJI_RECURRENCE_REGEX,
	EMOJI_PRIORITY_REGEX,
	EMOJI_CONTEXT_REGEX,
	EMOJI_PROJECT_PREFIX,
	DV_START_DATE_REGEX,
	DV_COMPLETED_DATE_REGEX,
	DV_DUE_DATE_REGEX,
	DV_SCHEDULED_DATE_REGEX,
	DV_CREATED_DATE_REGEX,
	DV_RECURRENCE_REGEX,
	DV_PRIORITY_REGEX,
	DV_PROJECT_REGEX,
	DV_CONTEXT_REGEX,
	ANY_DATAVIEW_FIELD_REGEX,
	EMOJI_TAG_REGEX,
} from "../../common/regex-define";
import { PRIORITY_MAP } from "../../common/default-symbol";
import { MarkdownTaskParser } from "./ConfigurableTaskParser";
import {
	TaskParserConfig,
	MetadataParseMode,
	createDefaultParserConfig,
} from "../../types/TaskParserConfig";

type MetadataFormat = "tasks" | "dataview"; // Define the type for clarity

// --- Helper function to create parser config from legacy settings ---
function createParserConfigFromSettings(
	settings: TaskWorkerSettings
): TaskParserConfig {
	const config = createDefaultParserConfig();

	// Map legacy preferMetadataFormat to new MetadataParseMode
	switch (settings.preferMetadataFormat) {
		case "dataview":
			config.metadataParseMode = MetadataParseMode.DataviewOnly;
			break;
		case "tasks":
			config.metadataParseMode = MetadataParseMode.EmojiOnly;
			break;
		default:
			config.metadataParseMode = MetadataParseMode.Both;
			break;
	}

	// Enable all parsing by default for backward compatibility
	config.parseMetadata = true;
	config.parseTags = true;
	config.parseComments = true;
	config.parseHeadings = true;

	return config;
}

/**
 * Enhanced task parsing using configurable parser
 */
function parseTasksWithConfigurableParser(
	filePath: string,
	content: string,
	settings: TaskWorkerSettings
): Task[] {
	try {
		const parserConfig = createParserConfigFromSettings(settings);
		const parser = new MarkdownTaskParser(parserConfig);

		// Use legacy parse method for backward compatibility
		return parser.parseLegacy(content, filePath);
	} catch (error) {
		console.warn(
			"Enhanced parser failed, falling back to legacy parser:",
			error
		);
		// Fallback to legacy parsing if new parser fails
		return parseTasksFromContent(
			filePath,
			content,
			settings.preferMetadataFormat,
			settings.ignoreHeading,
			settings.focusHeading
		);
	}
}

// --- Legacy Metadata Extraction Functions (kept for fallback) ---

// Each function now takes task, content, and format, returns remaining content
// They modify the task object directly.

function extractDates(
	task: Task,
	content: string,
	format: MetadataFormat
): string {
	let remainingContent = content;
	const useDataview = format === "dataview";

	const tryParseAndAssign = (
		regex: RegExp,
		fieldName:
			| "dueDate"
			| "scheduledDate"
			| "startDate"
			| "completedDate"
			| "createdDate"
	): boolean => {
		if (task[fieldName] !== undefined) return false; // Already assigned

		const match = remainingContent.match(regex);
		if (match && match[1]) {
			const dateVal = parseLocalDate(match[1]);
			if (dateVal !== undefined) {
				task[fieldName] = dateVal; // Direct assignment is type-safe
				remainingContent = remainingContent.replace(match[0], "");
				return true;
			}
		}
		return false;
	};

	// Due Date
	if (useDataview) {
		!tryParseAndAssign(DV_DUE_DATE_REGEX, "dueDate") &&
			tryParseAndAssign(EMOJI_DUE_DATE_REGEX, "dueDate");
	} else {
		!tryParseAndAssign(EMOJI_DUE_DATE_REGEX, "dueDate") &&
			tryParseAndAssign(DV_DUE_DATE_REGEX, "dueDate");
	}

	// Scheduled Date
	if (useDataview) {
		!tryParseAndAssign(DV_SCHEDULED_DATE_REGEX, "scheduledDate") &&
			tryParseAndAssign(EMOJI_SCHEDULED_DATE_REGEX, "scheduledDate");
	} else {
		!tryParseAndAssign(EMOJI_SCHEDULED_DATE_REGEX, "scheduledDate") &&
			tryParseAndAssign(DV_SCHEDULED_DATE_REGEX, "scheduledDate");
	}

	// Start Date
	if (useDataview) {
		!tryParseAndAssign(DV_START_DATE_REGEX, "startDate") &&
			tryParseAndAssign(EMOJI_START_DATE_REGEX, "startDate");
	} else {
		!tryParseAndAssign(EMOJI_START_DATE_REGEX, "startDate") &&
			tryParseAndAssign(DV_START_DATE_REGEX, "startDate");
	}

	// Completion Date
	if (useDataview) {
		!tryParseAndAssign(DV_COMPLETED_DATE_REGEX, "completedDate") &&
			tryParseAndAssign(EMOJI_COMPLETED_DATE_REGEX, "completedDate");
	} else {
		!tryParseAndAssign(EMOJI_COMPLETED_DATE_REGEX, "completedDate") &&
			tryParseAndAssign(DV_COMPLETED_DATE_REGEX, "completedDate");
	}

	// Created Date
	if (useDataview) {
		!tryParseAndAssign(DV_CREATED_DATE_REGEX, "createdDate") &&
			tryParseAndAssign(EMOJI_CREATED_DATE_REGEX, "createdDate");
	} else {
		!tryParseAndAssign(EMOJI_CREATED_DATE_REGEX, "createdDate") &&
			tryParseAndAssign(DV_CREATED_DATE_REGEX, "createdDate");
	}

	return remainingContent;
}

function extractRecurrence(
	task: Task,
	content: string,
	format: MetadataFormat
): string {
	let remainingContent = content;
	const useDataview = format === "dataview";
	let match: RegExpMatchArray | null = null;

	if (useDataview) {
		match = remainingContent.match(DV_RECURRENCE_REGEX);
		if (match && match[1]) {
			task.recurrence = match[1].trim();
			remainingContent = remainingContent.replace(match[0], "");
			return remainingContent; // Found preferred format
		}
	}

	// Try emoji format (primary or fallback)
	match = remainingContent.match(EMOJI_RECURRENCE_REGEX);
	if (match && match[1]) {
		task.recurrence = match[1].trim();
		remainingContent = remainingContent.replace(match[0], "");
	}

	return remainingContent;
}

function extractPriority(
	task: Task,
	content: string,
	format: MetadataFormat
): string {
	let remainingContent = content;
	const useDataview = format === "dataview";
	let match: RegExpMatchArray | null = null;

	if (useDataview) {
		match = remainingContent.match(DV_PRIORITY_REGEX);
		if (match && match[1]) {
			const priorityValue = match[1].trim().toLowerCase();
			const mappedPriority = PRIORITY_MAP[priorityValue];
			if (mappedPriority !== undefined) {
				task.priority = mappedPriority;
				remainingContent = remainingContent.replace(match[0], "");
				return remainingContent;
			} else {
				const numericPriority = parseInt(priorityValue, 10);
				if (!isNaN(numericPriority)) {
					task.priority = numericPriority;
					remainingContent = remainingContent.replace(match[0], "");
					return remainingContent;
				}
			}
		}
	}

	// Try emoji format (primary or fallback)
	match = remainingContent.match(EMOJI_PRIORITY_REGEX);
	if (match && match[1]) {
		task.priority = PRIORITY_MAP[match[1]] ?? undefined;
		if (task.priority !== undefined) {
			remainingContent = remainingContent.replace(match[0], "");
		}
	}

	return remainingContent;
}

function extractProject(
	task: Task,
	content: string,
	format: MetadataFormat
): string {
	let remainingContent = content;
	const useDataview = format === "dataview";
	let match: RegExpMatchArray | null = null;

	if (useDataview) {
		match = remainingContent.match(DV_PROJECT_REGEX);
		if (match && match[1]) {
			task.project = match[1].trim();
			remainingContent = remainingContent.replace(match[0], "");
			return remainingContent; // Found preferred format
		}
	}

	// Try #project/ prefix (primary or fallback)
	const projectTagRegex = new RegExp(EMOJI_PROJECT_PREFIX + "([\\w/-]+)");
	match = remainingContent.match(projectTagRegex);
	if (match && match[1]) {
		task.project = match[1].trim();
		// Do not remove here; let tag extraction handle it
	}

	return remainingContent;
}

function extractContext(
	task: Task,
	content: string,
	format: MetadataFormat
): string {
	let remainingContent = content;
	const useDataview = format === "dataview";
	let match: RegExpMatchArray | null = null;

	if (useDataview) {
		match = remainingContent.match(DV_CONTEXT_REGEX);
		if (match && match[1]) {
			task.context = match[1].trim();
			remainingContent = remainingContent.replace(match[0], "");
			return remainingContent; // Found preferred format
		}
	}

	// Skip @ contexts inside wiki links [[...]]
	// First, extract all wiki link patterns
	const wikiLinkMatches: string[] = [];
	const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
	let wikiMatch;
	while ((wikiMatch = wikiLinkRegex.exec(remainingContent)) !== null) {
		wikiLinkMatches.push(wikiMatch[0]);
	}

	// Try @ prefix (primary or fallback)
	// Use .exec to find the first match only for @context
	const contextMatch = new RegExp(EMOJI_CONTEXT_REGEX.source, "").exec(
		remainingContent
	); // Non-global search for first

	if (contextMatch && contextMatch[1]) {
		// Check if this @context is inside a wiki link
		const matchPosition = contextMatch.index;
		const isInsideWikiLink = wikiLinkMatches.some((link) => {
			const linkStart = remainingContent.indexOf(link);
			const linkEnd = linkStart + link.length;
			return matchPosition >= linkStart && matchPosition < linkEnd;
		});

		// Only process if not inside a wiki link
		if (!isInsideWikiLink) {
			task.context = contextMatch[1].trim();
			// Remove the first matched context tag here to avoid it being parsed as a general tag
			remainingContent = remainingContent.replace(contextMatch[0], "");
		}
	}

	return remainingContent;
}

function extractTags(
	task: Task,
	content: string,
	format: MetadataFormat
): string {
	let remainingContent = content;
	const useDataview = format === "dataview";

	// If using Dataview, remove all potential DV fields first
	if (useDataview) {
		remainingContent = remainingContent.replace(
			ANY_DATAVIEW_FIELD_REGEX,
			""
		);
	}

	// Exclude links (both wiki and markdown) and inline code from tag processing
	const generalWikiLinkRegex = /\[\[([^\]\[\]]+)\]\]/g; // Matches [[content]]
	const aliasedWikiLinkRegex = /\[\[(?!.+?:)([^\]\[\]]+)\|([^\]\[\]]+)\]\]/g; // Matches [[link|alias]]
	const markdownLinkRegex = /\[([^\[\]]*)\]\((.*?)\)/g;
	const inlineCodeRegex = /`([^`]+?)`/g; // Matches `code`

	const exclusions: { text: string; start: number; end: number }[] = [];
	let match: RegExpExecArray | null;
	let processedContent = remainingContent;

	// Find all general wiki links and their positions
	generalWikiLinkRegex.lastIndex = 0;
	while ((match = generalWikiLinkRegex.exec(remainingContent)) !== null) {
		exclusions.push({
			text: match[0],
			start: match.index,
			end: match.index + match[0].length,
		});
	}

	// Find all aliased wiki links
	aliasedWikiLinkRegex.lastIndex = 0;
	while ((match = aliasedWikiLinkRegex.exec(remainingContent)) !== null) {
		const overlaps = exclusions.some(
			(ex) =>
				Math.max(ex.start, match!.index) <
				Math.min(ex.end, match!.index + match![0].length)
		);
		if (!overlaps) {
			exclusions.push({
				text: match![0],
				start: match!.index,
				end: match!.index + match![0].length,
			});
		}
	}

	// Find all markdown links
	markdownLinkRegex.lastIndex = 0;
	while ((match = markdownLinkRegex.exec(remainingContent)) !== null) {
		const overlaps = exclusions.some(
			(ex) =>
				Math.max(ex.start, match!.index) <
				Math.min(ex.end, match!.index + match![0].length)
		);
		if (!overlaps) {
			exclusions.push({
				text: match![0],
				start: match!.index,
				end: match!.index + match![0].length,
			});
		}
	}

	// Find all inline code blocks
	inlineCodeRegex.lastIndex = 0;
	while ((match = inlineCodeRegex.exec(remainingContent)) !== null) {
		// Check for overlaps with existing exclusions (e.g. a code block inside a link, though unlikely for tags)
		const overlaps = exclusions.some(
			(ex) =>
				Math.max(ex.start, match!.index) <
				Math.min(ex.end, match!.index + match![0].length)
		);
		if (!overlaps) {
			exclusions.push({
				text: match![0], // Store the full match `code`
				start: match!.index,
				end: match!.index + match![0].length,
			});
		}
	}

	// Sort exclusions by start position to process them correctly
	exclusions.sort((a, b) => a.start - b.start);

	// Temporarily replace excluded segments (links, inline code) with placeholders
	if (exclusions.length > 0) {
		let offset = 0; // This offset logic needs care if lengths change.
		// Using spaces as placeholders maintains original string length and indices for subsequent operations.
		let tempProcessedContent = processedContent.split("");

		for (const ex of exclusions) {
			// Replace the content of the exclusion with spaces
			for (let i = ex.start; i < ex.end; i++) {
				// Check boundary condition for tempProcessedContent
				if (i < tempProcessedContent.length) {
					tempProcessedContent[i] = " ";
				}
			}
		}
		processedContent = tempProcessedContent.join("");
	}

	// Find all #tags in the content with links and inline code replaced by placeholders
	const tagMatches = processedContent.match(EMOJI_TAG_REGEX) || [];
	task.tags = tagMatches.map((tag) => tag.trim());

	// If using 'tasks' (emoji) format, derive project from tags if not set
	// Also make sure project wasn't already set by DV format before falling back
	if (!useDataview && !task.project) {
		const projectTag = task.tags.find(
			(tag) =>
				typeof tag === "string" && tag.startsWith(EMOJI_PROJECT_PREFIX)
		);
		if (projectTag) {
			task.project = projectTag.substring(EMOJI_PROJECT_PREFIX.length);
		}
	}

	// If using Dataview format, filter out any remaining #project/ tags from the tag list
	if (useDataview) {
		task.tags = task.tags.filter(
			(tag) =>
				typeof tag === "string" && !tag.startsWith(EMOJI_PROJECT_PREFIX)
		);
	}

	// Remove found tags (including potentially #project/ tags if format is 'tasks') from the original remaining content
	let contentWithoutTagsOrContext = remainingContent;
	for (const tag of task.tags) {
		// Ensure the tag is not empty or just '#' before creating regex
		if (tag && tag !== "#") {
			const escapedTag = tag.replace(/[.*+?^${}()|[\\\]]/g, "\\$&");
			const tagRegex = new RegExp(`\s?` + escapedTag + `(?=\s|$)`, "g");
			contentWithoutTagsOrContext = contentWithoutTagsOrContext.replace(
				tagRegex,
				""
			);
		}
	}

	// Also remove any remaining @context tags, making sure not to remove them from within links or inline code
	// We need to re-use the `exclusions` logic for this.
	let finalContent = "";
	let lastIndex = 0;
	// Use the original `remainingContent` that has had tags removed but not context yet,
	// but for context removal, we refer to `exclusions` based on the *original* content.
	let contentForContextRemoval = contentWithoutTagsOrContext;

	if (exclusions.length > 0) {
		// Process content segments between exclusions
		for (const ex of exclusions) {
			// Segment before the current exclusion
			const segment = contentForContextRemoval.substring(
				lastIndex,
				ex.start
			);
			// Remove @context from this segment
			finalContent += segment.replace(EMOJI_CONTEXT_REGEX, "").trim(); // Using global regex here
			// Add the original excluded text (link or code) back
			finalContent += ex.text; // Add the original link/code text back
			lastIndex = ex.end;
		}
		// Process the remaining segment after the last exclusion
		const lastSegment = contentForContextRemoval.substring(lastIndex);
		finalContent += lastSegment.replace(EMOJI_CONTEXT_REGEX, "").trim(); // Global regex
	} else {
		// No exclusions, safe to remove @context directly from the whole content
		finalContent = contentForContextRemoval
			.replace(EMOJI_CONTEXT_REGEX, "")
			.trim(); // Global regex
	}

	// Clean up extra spaces that might result from replacements
	finalContent = finalContent.replace(/\s{2,}/g, " ").trim();

	return finalContent;
}

/**
 * Parse tasks from file content using regex and metadata format preference
 */
function parseTasksFromContent(
	filePath: string,
	content: string,
	format: MetadataFormat,
	ignoreHeading: string,
	focusHeading: string
): Task[] {
	const lines = content.split(/\r?\n/);
	const tasks: Task[] = [];
	let inCodeBlock = false; // Flag to track if currently inside a code block

	// 保存当前的标题层级
	const headings: string[] = [];

	// 将ignoreHeading和focusHeading解析为数组
	const ignoreHeadings = ignoreHeading
		? ignoreHeading.split(",").map((h) => h.trim())
		: [];
	const focusHeadings = focusHeading
		? focusHeading.split(",").map((h) => h.trim())
		: [];

	// 检查当前标题是否应该被过滤
	const shouldFilterHeading = () => {
		// 如果focusHeading不为空，只保留在focusHeading列表中的标题
		if (focusHeadings.length > 0) {
			return !headings.some((h) =>
				focusHeadings.some((fh) => h.includes(fh))
			);
		}

		// 如果ignoreHeading不为空，忽略在ignoreHeading列表中的标题
		if (ignoreHeadings.length > 0) {
			return headings.some((h) =>
				ignoreHeadings.some((ih) => h.includes(ih))
			);
		}

		// 两者都为空，不过滤
		return false;
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check for code block fences
		if (line.trim().startsWith("```") || line.trim().startsWith("~~~")) {
			inCodeBlock = !inCodeBlock;
			continue; // Skip fence line from task processing
		}

		if (inCodeBlock) {
			continue; // Skip lines inside code blocks
		}

		// 检查是否是标题行
		const headingMatch = line.match(/^(#{1,6})\s+(.*?)(?:\s+#+)?$/);
		if (headingMatch) {
			const [_, headingMarkers, headingText] = headingMatch;
			const level = headingMarkers.length;

			// 更新标题栈，移除所有级别大于等于当前级别的标题
			while (headings.length > 0) {
				const lastHeadingLevel = (
					headings[headings.length - 1].match(/^(#{1,6})/)?.[1] || ""
				).length;
				if (lastHeadingLevel >= level) {
					headings.pop();
				} else {
					break;
				}
			}

			// 添加当前标题到栈
			headings.push(`${headingMarkers} ${headingText.trim()}`);
		}

		const taskMatch = line.match(TASK_REGEX);

		if (taskMatch) {
			// 如果当前标题应该被过滤，则跳过此任务
			if (shouldFilterHeading()) {
				continue;
			}

			const [fullMatch, , , , status, contentWithMetadata] = taskMatch;
			if (status === undefined || contentWithMetadata === undefined)
				continue;

			// Validate task status character to prevent misinterpretation of markdown links (e.g., [队](...))
			// Allowed status characters: x, X, space, /, -, >, <, ?, !, *, etc.
			// This is a workaround; ideally, TASK_REGEX itself should be more restrictive.
			const validStatusChars = /^[xX\s\/\-><\?!\*]$/;
			if (!validStatusChars.test(status)) {
				// If the status is not a typical task marker, assume it's not a task
				// This helps avoid matching things like `[队](link.md)`
				continue;
			}

			const completed = status.toLowerCase() === "x";
			const id = `${filePath}-L${i}`;

			const task: Task = {
				id,
				content: contentWithMetadata.trim(), // Will be set after extraction
				filePath,
				line: i,
				completed,
				status: status,
				originalMarkdown: line,
				tags: [],
				children: [],
				priority: undefined,
				startDate: undefined,
				dueDate: undefined,
				scheduledDate: undefined,
				completedDate: undefined,
				createdDate: undefined,
				recurrence: undefined,
				project: undefined,
				context: undefined,
				heading: [...headings], // 复制当前标题层级
			};

			// Extract metadata in order
			let remainingContent = contentWithMetadata;
			remainingContent = extractDates(task, remainingContent, format);
			remainingContent = extractRecurrence(
				task,
				remainingContent,
				format
			);
			remainingContent = extractPriority(task, remainingContent, format);
			remainingContent = extractProject(task, remainingContent, format); // Extract project before context/tags
			remainingContent = extractContext(task, remainingContent, format);
			remainingContent = extractTags(task, remainingContent, format); // Tags last

			task.content = remainingContent.replace(/\s{2,}/g, " ").trim();

			tasks.push(task);
		}
	}
	buildTaskHierarchy(tasks); // Call hierarchy builder if needed
	return tasks;
}

/**
 * Extract date from file path
 */
function extractDateFromPath(
	filePath: string,
	settings: {
		useDailyNotePathAsDate: boolean;
		dailyNoteFormat: string;
		dailyNotePath: string;
	}
): number | undefined {
	if (!settings.useDailyNotePathAsDate) return undefined;

	// Remove file extension first
	let pathToMatch = filePath.replace(/\.[^/.]+$/, "");

	// If dailyNotePath is specified, remove it from the path
	if (
		settings.dailyNotePath &&
		pathToMatch.startsWith(settings.dailyNotePath)
	) {
		pathToMatch = pathToMatch.substring(settings.dailyNotePath.length);
		// Remove leading slash if present
		if (pathToMatch.startsWith("/")) {
			pathToMatch = pathToMatch.substring(1);
		}
	}

	// Try to match with the current path
	let dateFromPath = parse(pathToMatch, settings.dailyNoteFormat, new Date());

	// If no match, recursively try with subpaths
	if (isNaN(dateFromPath.getTime()) && pathToMatch.includes("/")) {
		return extractDateFromPath(
			pathToMatch.substring(pathToMatch.indexOf("/") + 1),
			{
				...settings,
				dailyNotePath: "", // Clear dailyNotePath for recursive calls
			}
		);
	}

	// Return the timestamp if we found a valid date
	if (!isNaN(dateFromPath.getTime())) {
		return dateFromPath.getTime();
	}

	return undefined;
}

/**
 * Process a single file - Enhanced with configurable parser
 */
function processFile(
	filePath: string,
	content: string,
	stats: FileStats,
	settings: TaskWorkerSettings
): TaskParseResult {
	const startTime = performance.now();
	try {
		// Try enhanced configurable parser first
		let tasks: Task[];
		try {
			tasks = parseTasksWithConfigurableParser(
				filePath,
				content,
				settings
			);
		} catch (error) {
			console.warn("Enhanced parser failed, using legacy parser:", error);
			// Fallback to legacy parser
			tasks = parseTasksFromContent(
				filePath,
				content,
				settings.preferMetadataFormat,
				settings.ignoreHeading,
				settings.focusHeading
			);
		}
		const completedTasks = tasks.filter((t) => t.completed).length;
		try {
			if (
				(filePath.startsWith(settings.dailyNotePath) ||
					("/" + filePath).startsWith(settings.dailyNotePath)) &&
				settings.dailyNotePath &&
				settings.useDailyNotePathAsDate
			) {
				for (const task of tasks) {
					const dateFromPath = extractDateFromPath(filePath, {
						useDailyNotePathAsDate: settings.useDailyNotePathAsDate,
						dailyNoteFormat: settings.dailyNoteFormat
							.replace(/Y/g, "y")
							.replace(/D/g, "d"),
						dailyNotePath: settings.dailyNotePath,
					});
					if (dateFromPath) {
						if (settings.useAsDateType === "due" && !task.dueDate) {
							task.dueDate = dateFromPath;
						} else if (
							settings.useAsDateType === "start" &&
							!task.startDate
						) {
							task.startDate = dateFromPath;
						} else if (
							settings.useAsDateType === "scheduled" &&
							!task.scheduledDate
						) {
							task.scheduledDate = dateFromPath;
						}

						task.useAsDateType = settings.useAsDateType;
					}
				}
			}
		} catch (error) {
			console.error(`Worker: Error processing file ${filePath}:`, error);
		}

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
		console.error(`Worker: Error processing file ${filePath}:`, error);
		throw error;
	}
}

// --- Batch processing function remains largely the same, but calls updated processFile ---
function processBatch(
	files: { path: string; content: string; stats: FileStats }[],
	settings: TaskWorkerSettings
): BatchIndexResult {
	// Ensure return type matches definition
	const startTime = performance.now();
	const results: { filePath: string; taskCount: number }[] = [];
	let totalTasks = 0;
	let failedFiles = 0; // Keep track for potential logging, but not returned in stats

	for (const file of files) {
		try {
			const parseResult = processFile(
				file.path,
				file.content,
				file.stats,
				settings
			);
			totalTasks += parseResult.stats.totalTasks;
			results.push({
				filePath: parseResult.filePath,
				taskCount: parseResult.stats.totalTasks,
			});
		} catch (error) {
			console.error(
				`Worker: Error in batch processing for file ${file.path}:`,
				error
			);
			failedFiles++;
		}
	}

	return {
		type: "batchResult",
		results, // Now matches expected type
		stats: {
			// Only include fields defined in the type
			totalFiles: files.length,
			totalTasks,
			processingTimeMs: Math.round(performance.now() - startTime),
		},
	};
}

// --- Update message handler to access properties directly ---
self.onmessage = async (event) => {
	try {
		const message = event.data as IndexerCommand; // Keep using IndexerCommand union type

		// Access preferMetadataFormat directly FROM message, NOT message.payload
		// Provide default 'tasks' if missing
		const settings = message.settings || {
			preferMetadataFormat: "tasks",
			useDailyNotePathAsDate: false,
			dailyNoteFormat: "yyyy-MM-dd",
			useAsDateType: "due",
			dailyNotePath: "",
			ignoreHeading: "",
			focusHeading: "",
		};

		// Using 'as any' here because I cannot modify IndexerCommand type directly,
		// but the sending code MUST add this property to the message object.

		if (message.type === "parseTasks") {
			// Type guard for ParseTasksCommand
			try {
				// Access properties directly from message
				const result = processFile(
					message.filePath,
					message.content,
					message.stats,
					settings
				);
				self.postMessage(result);
			} catch (error) {
				self.postMessage({
					type: "error",
					error:
						error instanceof Error ? error.message : String(error),
					filePath: message.filePath, // Access directly
				} as ErrorResult);
			}
		} else if (message.type === "batchIndex") {
			// Type guard for BatchIndexCommand
			// Access properties directly from message
			const result = processBatch(message.files, settings);
			self.postMessage(result);
		} else {
			console.error(
				"Worker: Unknown or invalid command message:",
				message
			);
			self.postMessage({
				type: "error",
				error: `Unknown command type: ${(message as any).type}`,
			} as ErrorResult);
		}
	} catch (error) {
		console.error("Worker: General error in onmessage handler:", error);
		self.postMessage({
			type: "error",
			error: error instanceof Error ? error.message : String(error),
		} as ErrorResult);
	}
};

// Remove buildTaskHierarchy and getIndentLevel if not used by parseTasksFromContent
// Or keep them if you plan to add indentation-based hierarchy later.
/**
 * Build parent-child relationships based on indentation
 */
function buildTaskHierarchy(tasks: Task[]): void {
	tasks.sort((a, b) => a.line - b.line);
	const taskStack: { task: Task; indent: number }[] = [];
	for (const currentTask of tasks) {
		const currentIndent = getIndentLevel(currentTask.originalMarkdown);
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

/**
 * Get indentation level of a line
 */
function getIndentLevel(line: string): number {
	const match = line.match(/^(\s*)/);
	return match ? match[1].length : 0;
}
