import {
	App,
	FuzzySuggestModal,
	TFile,
	Notice,
	Editor,
	FuzzyMatch,
	SuggestModal,
	MetadataCache,
	MarkdownView,
	MarkdownFileInfo,
	moment,
} from "obsidian";
import TaskProgressBarPlugin from "..";
import { buildIndentString, getTabSize } from "../utils";
import { t } from "../translations/helper";

/**
 * Modal for selecting a target file to move completed tasks to
 */
export class CompletedTaskFileSelectionModal extends FuzzySuggestModal<
	TFile | string
> {
	plugin: TaskProgressBarPlugin;
	editor: Editor;
	currentFile: TFile;
	taskLines: number[];
	moveMode: "allCompleted" | "directChildren" | "all";

	constructor(
		app: App,
		plugin: TaskProgressBarPlugin,
		editor: Editor,
		currentFile: TFile,
		taskLines: number[],
		moveMode: "allCompleted" | "directChildren" | "all"
	) {
		super(app);
		this.plugin = plugin;
		this.editor = editor;
		this.currentFile = currentFile;
		this.taskLines = taskLines;
		this.moveMode = moveMode;
		this.setPlaceholder("Select a file or type to create a new one");
	}

	getItems(): (TFile | string)[] {
		// Get all markdown files
		const files = this.app.vault.getMarkdownFiles();

		// Filter out the current file
		const filteredFiles = files.filter(
			(file) => file.path !== this.currentFile.path
		);

		// Sort files by path
		filteredFiles.sort((a, b) => a.path.localeCompare(b.path));

		return filteredFiles;
	}

	getItemText(item: TFile | string): string {
		if (typeof item === "string") {
			return `Create new file: ${item}`;
		}
		return item.path;
	}

	renderSuggestion(item: FuzzyMatch<TFile | string>, el: HTMLElement): void {
		const match = item.item;
		if (typeof match === "string") {
			el.createEl("div", { text: `${t("Create new file:")} ${match}` });
		} else {
			el.createEl("div", { text: match.path });
		}
	}

	onChooseItem(item: TFile | string, evt: MouseEvent | KeyboardEvent): void {
		if (typeof item === "string") {
			// Create a new file
			this.createNewFileWithTasks(item);
		} else {
			// Show modal to select insertion point in existing file
			new CompletedTaskBlockSelectionModal(
				this.app,
				this.plugin,
				this.editor,
				this.currentFile,
				item,
				this.taskLines,
				this.moveMode
			).open();
		}
	}

	// If the query doesn't match any existing files, add an option to create a new file
	getSuggestions(query: string): FuzzyMatch<TFile | string>[] {
		const suggestions = super.getSuggestions(query);

		if (
			query &&
			!suggestions.some(
				(match) =>
					typeof match.item === "string" && match.item === query
			)
		) {
			// Check if it's a valid file path
			if (this.isValidFileName(query)) {
				// Add option to create a new file with this name
				suggestions.push({
					item: query,
					match: { score: 1, matches: [] },
				} as FuzzyMatch<string>);
			}
		}

		// Limit results to 20 to avoid performance issues
		return suggestions.slice(0, 20);
	}

	private isValidFileName(name: string): boolean {
		// Basic validation for file names
		return name.length > 0 && !name.includes("/") && !name.includes("\\");
	}

	private async createNewFileWithTasks(fileName: string) {
		try {
			// Ensure file name has .md extension
			if (!fileName.endsWith(".md")) {
				fileName += ".md";
			}

			// Get completed tasks content
			const completedTasksContent = this.getCompletedTasksWithChildren();

			// Reset indentation for new file (remove all indentation from tasks)
			const resetIndentContent = this.resetIndentation(
				completedTasksContent
			);

			// Create file in the same folder as current file
			const folder = this.currentFile.parent;
			const filePath = folder ? `${folder.path}/${fileName}` : fileName;

			// Create the file
			const newFile = await this.app.vault.create(
				filePath,
				resetIndentContent
			);

			// Remove the completed tasks from the current file
			this.removeCompletedTasksFromCurrentFile();

			// Open the new file
			this.app.workspace.getLeaf(true).openFile(newFile);

			new Notice(`${t("Completed tasks moved to")} ${fileName}`);
		} catch (error) {
			new Notice(`${t("Failed to create file:")} ${error}`);
			console.error(error);
		}
	}

	// Get completed tasks based on move mode
	private getCompletedTasksWithChildren(): string {
		const content = this.editor.getValue();
		const lines = content.split("\n");

		// Sort task lines in ascending order
		const sortedTaskLines = [...this.taskLines].sort((a, b) => a - b);

		// Process each task and track ranges to avoid duplicates
		const processedRanges: { start: number; end: number }[] = [];
		const resultLines: string[] = [];
		const linesToRemove: number[] = [];

		// Process each root task
		for (const taskLine of sortedTaskLines) {
			// Skip if this line is already included in a processed range
			if (this.isLineInProcessedRanges(taskLine, processedRanges)) {
				continue;
			}

			// Get the current task line
			const currentLine = lines[taskLine];
			const currentIndent = this.getIndentation(currentLine);

			// Extract the parent task's mark
			const parentTaskMatch = currentLine.match(/\[(.)]/);
			const parentTaskMark = parentTaskMatch ? parentTaskMatch[1] : "";

			// Clone parent task with marker
			let parentTaskWithMarker = this.addMarkerToTask(currentLine, true);

			// Complete parent task if setting is enabled
			parentTaskWithMarker =
				this.completeTaskIfNeeded(parentTaskWithMarker);

			// Include the current line
			resultLines.push(parentTaskWithMarker);

			// Find child tasks based on move mode
			const childRange = this.getChildTaskRange(
				taskLine,
				lines,
				currentIndent
			);

			// Store processed range to avoid duplicates
			processedRanges.push({
				start: taskLine,
				end: childRange.end,
			});

			// Collect child tasks and lines to remove based on move mode
			const { childLines, childLinesToRemove } = this.collectChildTasks(
				taskLine,
				lines,
				currentIndent,
				parentTaskMark
			);

			// Add child lines to result
			resultLines.push(...childLines);

			// Add lines to remove
			linesToRemove.push(...childLinesToRemove);

			// Add a separator between task blocks, but not after the last one
			if (taskLine !== sortedTaskLines[sortedTaskLines.length - 1]) {
				resultLines.push("");
			}
		}

		// Store lines to remove for later use
		this.plugin.linesToRemove = linesToRemove;

		return resultLines.join("\n");
	}

	// Check if a line is already in processed ranges
	private isLineInProcessedRanges(
		line: number,
		ranges: { start: number; end: number }[]
	): boolean {
		for (const range of ranges) {
			if (line >= range.start && line <= range.end) {
				return true;
			}
		}
		return false;
	}

	// Get the range of child tasks
	private getChildTaskRange(
		taskLine: number,
		lines: string[],
		parentIndent: number
	): { start: number; end: number } {
		let end = taskLine;

		// Find the end of the child tasks by looking for the next line with indentation <= parentIndent
		for (let i = taskLine + 1; i < lines.length; i++) {
			const lineIndent = this.getIndentation(lines[i]);
			if (lineIndent <= parentIndent) {
				break;
			}
			end = i;
		}

		return {
			start: taskLine,
			end: end,
		};
	}

	// Collect child tasks based on move mode
	private collectChildTasks(
		taskLine: number,
		lines: string[],
		currentIndent: number,
		parentTaskMark: string
	): { childLines: string[]; childLinesToRemove: number[] } {
		const childLines: string[] = [];
		const childLinesToRemove: number[] = [];

		// Check if the parent task is completed
		const parentIsCompleted = this.isCompletedTaskMark(parentTaskMark);

		// Don't remove the parent task by default, we're just copying it
		// Only add parent to remove if it's a completed task (and you want to remove completed tasks)
		// Change false to true if you want to remove parent tasks
		const shouldRemoveParent = parentIsCompleted && false;
		if (shouldRemoveParent) {
			childLinesToRemove.push(taskLine);
		}

		// Process child tasks according to moveMode
		if (this.moveMode === "all") {
			// Move all subtasks
			for (let i = taskLine + 1; i < lines.length; i++) {
				const line = lines[i];
				const lineIndent = this.getIndentation(line);

				if (lineIndent <= currentIndent) {
					break;
				}

				childLines.push(this.completeTaskIfNeeded(line));
				childLinesToRemove.push(i);
			}
		} else if (
			this.moveMode === "directChildren" ||
			this.moveMode === "allCompleted"
		) {
			// First collect all child tasks
			const childTasks: {
				line: string;
				index: number;
				indent: number;
				isCompleted: boolean;
			}[] = [];

			for (let i = taskLine + 1; i < lines.length; i++) {
				const line = lines[i];
				const lineIndent = this.getIndentation(line);

				if (lineIndent <= currentIndent) {
					break;
				}

				// Check if this is a task with a status
				const taskMatch = line.match(/\[(.)]/);
				const isCompleted = taskMatch
					? this.isCompletedTaskMark(taskMatch[1])
					: false;

				childTasks.push({
					line,
					index: i,
					indent: lineIndent,
					isCompleted,
				});
			}

			// Process based on mode
			if (this.moveMode === "allCompleted") {
				// Include all completed tasks and their children
				for (let i = 0; i < childTasks.length; i++) {
					const task = childTasks[i];
					if (task.isCompleted) {
						// Add this completed task
						childLines.push(this.completeTaskIfNeeded(task.line));
						childLinesToRemove.push(task.index);

						// Add all of its child tasks regardless of completion
						const taskIndent = task.indent;
						for (let j = i + 1; j < childTasks.length; j++) {
							const childTask = childTasks[j];
							if (childTask.indent <= taskIndent) {
								break; // Exit when we reach a task with same or lower indent
							}

							childLines.push(
								this.completeTaskIfNeeded(childTask.line)
							);
							childLinesToRemove.push(childTask.index);
						}
					}
				}
			} else if (this.moveMode === "directChildren") {
				// Find the minimum indent level which represents direct children
				let minIndent = Number.MAX_SAFE_INTEGER;
				for (const task of childTasks) {
					if (
						task.indent < minIndent &&
						task.indent > currentIndent
					) {
						minIndent = task.indent;
					}
				}

				// Process direct children
				for (let i = 0; i < childTasks.length; i++) {
					const task = childTasks[i];

					// Check if it's a direct child and completed
					if (task.indent === minIndent && task.isCompleted) {
						// Add this direct child
						childLines.push(this.completeTaskIfNeeded(task.line));
						childLinesToRemove.push(task.index);

						// Add all of its child tasks regardless of completion
						const taskIndent = task.indent;
						for (let j = i + 1; j < childTasks.length; j++) {
							const childTask = childTasks[j];
							if (childTask.indent <= taskIndent) {
								break; // Exit when we reach a task with same or lower indent
							}

							childLines.push(
								this.completeTaskIfNeeded(childTask.line)
							);
							childLinesToRemove.push(childTask.index);
						}
					}
				}
			}
		}

		return { childLines, childLinesToRemove };
	}

	// Find the parent task index for a given task
	private findParentTaskIndex(
		taskIndex: number,
		taskIndent: number,
		allTasks: {
			line: string;
			index: number;
			indent: number;
			isCompleted: boolean;
		}[]
	): number {
		// Look for the closest task with one level less indentation
		for (
			let i = allTasks.findIndex((t) => t.index === taskIndex) - 1;
			i >= 0;
			i--
		) {
			if (allTasks[i].indent < taskIndent) {
				return allTasks[i].index;
			}
		}
		return -1;
	}

	private getTabSize(): number {
		// Use the utility function to get tab size
		return getTabSize(this.app);
	}

	private getIndentation(line: string): number {
		const match = line.match(/^(\s*)/);
		return match ? match[1].length : 0;
	}

	private removeCompletedTasksFromCurrentFile() {
		if (
			!this.plugin.linesToRemove ||
			this.plugin.linesToRemove.length === 0
		) {
			return;
		}

		const content = this.editor.getValue();
		const lines = content.split("\n");

		// Get lines to remove (sorted in descending order to avoid index shifting)
		const linesToRemove = [...this.plugin.linesToRemove].sort(
			(a, b) => b - a
		);

		// Create a transaction to remove the lines
		this.editor.transaction({
			changes: linesToRemove.map((lineIndex) => {
				// Calculate start and end positions
				const startPos = {
					line: lineIndex,
					ch: 0,
				};

				// For the end position, use the next line's start or end of document
				const endPos =
					lineIndex + 1 < lines.length
						? { line: lineIndex + 1, ch: 0 }
						: { line: lineIndex, ch: lines[lineIndex].length };

				return {
					from: startPos,
					to: endPos,
					text: "",
				};
			}),
		});

		// Clear the lines to remove
		this.plugin.linesToRemove = [];
	}

	// Method to reset indentation for new files while maintaining hierarchy
	private resetIndentation(content: string): string {
		const lines = content.split("\n");
		if (lines.length === 0) return content;

		// Get indentation of the first line (root task)
		const rootIndent = this.getIndentation(lines[0]);

		// If already at 0 indentation, return as is
		if (rootIndent === 0) {
			return content;
		}

		// Adjust all lines to maintain relative indentation to the parent task
		return lines
			.map((line) => {
				if (line.trim().length === 0) return line; // Keep empty lines unchanged

				const currentIndent = this.getIndentation(line);
				// Subtract the root indentation to preserve relative indentation levels
				const newIndent = Math.max(0, currentIndent - rootIndent);

				// Generate proper indentation
				const indentString = buildIndentString(this.app).repeat(
					newIndent
				);

				// Return the line with adjusted indentation
				return indentString + line.trim();
			})
			.join("\n");
	}

	// Add marker to task (version, date, or custom)
	private addMarkerToTask(taskLine: string, isRoot = false): string {
		const {
			taskMarkerType,
			versionMarker,
			dateMarker,
			customMarker,
			withCurrentFileLink,
		} = this.plugin.settings.completedTaskMover;

		// Extract blockid if exists
		const blockidMatch = taskLine.match(/^(.*?)(?:\s+^[a-zA-Z0-9]{6}$)?$/);
		if (!blockidMatch) return taskLine;

		const mainContent = blockidMatch[1].trimEnd();
		const blockid = blockidMatch[2]?.trim();

		// Create base task line with marker
		let markedTaskLine = mainContent;

		// Basic check to ensure the task line doesn't already have this marker
		if (
			!mainContent.includes(versionMarker) &&
			!mainContent.includes(dateMarker) &&
			!mainContent.includes(this.processCustomMarker(customMarker))
		) {
			switch (taskMarkerType) {
				case "version":
					markedTaskLine = `${mainContent} ${versionMarker}`;
					break;
				case "date":
					markedTaskLine = `${mainContent} ${this.processDateMarker(
						dateMarker
					)}`;
					break;
				case "custom":
					markedTaskLine = `${mainContent} ${this.processCustomMarker(
						customMarker
					)}`;
					break;
				default:
					markedTaskLine = mainContent;
			}
		}

		// Add link to the current file if setting is enabled and this is a root task
		if (withCurrentFileLink && isRoot) {
			const currentFile = this.currentFile;
			const link = this.app.fileManager.generateMarkdownLink(
				currentFile,
				currentFile.path
			);
			markedTaskLine = `${markedTaskLine} from ${link}`;
		}

		// Add back the blockid if it exists
		if (blockid) {
			markedTaskLine = `${markedTaskLine} ${blockid}`;
		}

		return markedTaskLine;
	}

	// Process custom marker with date variables
	private processCustomMarker(marker: string): string {
		// Replace {{DATE:format}} with formatted date
		return marker.replace(/\{\{DATE:([^}]+)\}\}/g, (match, format) => {
			return moment().format(format);
		});
	}

	// Process date marker with {{date}} placeholder
	private processDateMarker(marker: string): string {
		return marker.replace(/\{\{date\}\}/g, () => {
			return moment().format("YYYY-MM-DD");
		});
	}

	// Check if a task mark represents a completed task
	private isCompletedTaskMark(mark: string): boolean {
		const completedMarks =
			this.plugin.settings.taskStatuses.completed?.split("|") || [
				"x",
				"X",
			];

		// If treatAbandonedAsCompleted is enabled, also consider abandoned tasks as completed
		if (this.plugin.settings.completedTaskMover.treatAbandonedAsCompleted) {
			const abandonedMarks =
				this.plugin.settings.taskStatuses.abandoned?.split("|") || [
					"-",
				];
			return (
				completedMarks.includes(mark) || abandonedMarks.includes(mark)
			);
		}

		return completedMarks.includes(mark);
	}
	// Complete tasks if the setting is enabled
	private completeTaskIfNeeded(taskLine: string): string {
		// If completeAllMovedTasks is not enabled, return the original line
		if (!this.plugin.settings.completedTaskMover.completeAllMovedTasks) {
			return taskLine;
		}

		// Check if it's a task line with checkbox
		const taskMatch = taskLine.match(/^(\s*(?:-|\d+\.|\*)\s+\[)(.)(].*)$/);

		if (!taskMatch) {
			return taskLine; // Not a task line, return as is
		}

		// Get the completion symbol (first character in completed status)
		const completedMark =
			this.plugin.settings.taskStatuses.completed?.split("|")[0] || "x";

		// Replace the current mark with the completed mark
		return `${taskMatch[1]}${completedMark}${taskMatch[3]}`;
	}
}

/**
 * Modal for selecting a block to insert after in the target file
 */
export class CompletedTaskBlockSelectionModal extends SuggestModal<{
	id: string;
	text: string;
	level: number;
}> {
	plugin: TaskProgressBarPlugin;
	editor: Editor;
	sourceFile: TFile;
	targetFile: TFile;
	taskLines: number[];
	metadataCache: MetadataCache;
	moveMode: "allCompleted" | "directChildren" | "all";

	constructor(
		app: App,
		plugin: TaskProgressBarPlugin,
		editor: Editor,
		sourceFile: TFile,
		targetFile: TFile,
		taskLines: number[],
		moveMode: "allCompleted" | "directChildren" | "all"
	) {
		super(app);
		this.plugin = plugin;
		this.editor = editor;
		this.sourceFile = sourceFile;
		this.targetFile = targetFile;
		this.taskLines = taskLines;
		this.metadataCache = app.metadataCache;
		this.moveMode = moveMode;
		this.setPlaceholder("Select a block to insert after");
	}

	// Add getIndentation method
	private getIndentation(line: string): number {
		const match = line.match(/^(\s*)/);
		return match ? match[1].length : 0;
	}

	// Add getTabSize method
	private getTabSize(): number {
		// Use the utility function to get tab size
		return getTabSize(this.app);
	}

	async getSuggestions(
		query: string
	): Promise<{ id: string; text: string; level: number }[]> {
		// Get file content
		const fileContent = await this.app.vault.read(this.targetFile);
		const lines = fileContent.split("\n");

		// Get file cache to find headings and list items
		const fileCache = this.metadataCache.getFileCache(this.targetFile);

		let blocks: { id: string; text: string; level: number }[] = [];

		// Add an option to insert at the beginning of the file
		blocks.push({
			id: "beginning",
			text: t("Beginning of file"),
			level: 0,
		});

		blocks.push({
			id: "end",
			text: t("End of file"),
			level: 0,
		});

		// Add headings
		if (fileCache && fileCache.headings) {
			for (const heading of fileCache.headings) {
				const text = lines[heading.position.start.line];
				blocks.push({
					id: `heading-${heading.position.start.line}`,
					text: text,
					level: heading.level,
				});
			}
		}

		// Add list items
		if (fileCache && fileCache.listItems) {
			for (const listItem of fileCache.listItems) {
				const text = lines[listItem.position.start.line];
				blocks.push({
					id: `list-${listItem.position.start.line}`,
					text: text,
					level: this.getIndentation(text),
				});
			}
		}

		// Filter blocks based on query
		if (query) {
			blocks = blocks.filter((block) =>
				block.text.toLowerCase().includes(query.toLowerCase())
			);
		}

		// Limit results to 20 to avoid performance issues
		return blocks.slice(0, 20);
	}

	renderSuggestion(
		block: { id: string; text: string; level: number },
		el: HTMLElement
	) {
		const indent = "  ".repeat(block.level);

		if (block.id === "beginning" || block.id === "end") {
			el.createEl("div", { text: block.text });
		} else {
			el.createEl("div", { text: `${indent}${block.text}` });
		}
	}

	onChooseSuggestion(
		block: { id: string; text: string; level: number },
		evt: MouseEvent | KeyboardEvent
	) {
		this.moveCompletedTasksToTargetFile(block);
	}

	private async moveCompletedTasksToTargetFile(block: {
		id: string;
		text: string;
		level: number;
	}) {
		try {
			// Get completed tasks content
			const completedTasksContent = this.getCompletedTasksWithChildren();

			// Read target file content
			const fileContent = await this.app.vault.read(this.targetFile);
			const lines = fileContent.split("\n");

			let insertPosition: number;
			let indentLevel: number = 0;

			if (block.id === "beginning") {
				insertPosition = 0;
			} else if (block.id === "end") {
				insertPosition = lines.length;
			} else {
				// Extract line number from block id
				const lineMatch = block.id.match(/-(\d+)$/);
				if (!lineMatch) {
					throw new Error("Invalid block ID");
				}

				const lineNumber = parseInt(lineMatch[1]);
				insertPosition = lineNumber + 1;

				// Get indentation of the target block
				indentLevel = this.getIndentation(lines[lineNumber]);
			}

			// Adjust indentation of task content to match the target block
			const indentedTaskContent = this.adjustIndentation(
				completedTasksContent,
				indentLevel
			);

			// Insert task at the position
			const newContent = [
				...lines.slice(0, insertPosition),
				indentedTaskContent,
				...lines.slice(insertPosition),
			].join("\n");

			// Update target file
			await this.app.vault.modify(this.targetFile, newContent);

			// Remove completed tasks from source file
			this.removeCompletedTasksFromSourceFile();

			// Open the target file
			// this.app.workspace.getLeaf().openFile(this.targetFile);

			new Notice(
				`${t("Completed tasks moved to")} ${this.targetFile.path}`
			);
		} catch (error) {
			new Notice(`${t("Failed to move tasks:")} ${error}`);
			console.error(error);
		}
	}

	private getCompletedTasksWithChildren(): string {
		const content = this.editor.getValue();
		const lines = content.split("\n");

		// Sort task lines in ascending order
		const sortedTaskLines = [...this.taskLines].sort((a, b) => a - b);

		// Process each task and track ranges to avoid duplicates
		const processedRanges: { start: number; end: number }[] = [];
		const resultLines: string[] = [];
		const linesToRemove: number[] = [];

		// Process each root task
		for (const taskLine of sortedTaskLines) {
			// Skip if this line is already included in a processed range
			if (this.isLineInProcessedRanges(taskLine, processedRanges)) {
				continue;
			}

			// Get the current task line
			const currentLine = lines[taskLine];
			const currentIndent = this.getIndentation(currentLine);

			// Extract the parent task's mark
			const parentTaskMatch = currentLine.match(/\[(.)]/);
			const parentTaskMark = parentTaskMatch ? parentTaskMatch[1] : "";

			// Clone parent task with marker
			let parentTaskWithMarker = this.addMarkerToTask(currentLine, true);

			// Complete parent task if setting is enabled
			parentTaskWithMarker =
				this.completeTaskIfNeeded(parentTaskWithMarker);

			// Include the current line
			resultLines.push(parentTaskWithMarker);

			// Find child tasks based on move mode
			const childRange = this.getChildTaskRange(
				taskLine,
				lines,
				currentIndent
			);

			// Store processed range to avoid duplicates
			processedRanges.push({
				start: taskLine,
				end: childRange.end,
			});

			// Collect child tasks and lines to remove based on move mode
			const { childLines, childLinesToRemove } = this.collectChildTasks(
				taskLine,
				lines,
				currentIndent,
				parentTaskMark
			);

			// Add child lines to result
			resultLines.push(...childLines);

			// Add lines to remove
			linesToRemove.push(...childLinesToRemove);

			// Add a separator between task blocks, but not after the last one
			if (taskLine !== sortedTaskLines[sortedTaskLines.length - 1]) {
				resultLines.push("");
			}
		}

		// Store lines to remove for later use
		this.plugin.linesToRemove = linesToRemove;

		return resultLines.join("\n");
	}

	// Check if a line is already in processed ranges
	private isLineInProcessedRanges(
		line: number,
		ranges: { start: number; end: number }[]
	): boolean {
		for (const range of ranges) {
			if (line >= range.start && line <= range.end) {
				return true;
			}
		}
		return false;
	}

	// Get the range of child tasks
	private getChildTaskRange(
		taskLine: number,
		lines: string[],
		parentIndent: number
	): { start: number; end: number } {
		let end = taskLine;

		// Find the end of the child tasks by looking for the next line with indentation <= parentIndent
		for (let i = taskLine + 1; i < lines.length; i++) {
			const lineIndent = this.getIndentation(lines[i]);
			if (lineIndent <= parentIndent) {
				break;
			}
			end = i;
		}

		return {
			start: taskLine,
			end: end,
		};
	}

	// Collect child tasks based on move mode
	private collectChildTasks(
		taskLine: number,
		lines: string[],
		currentIndent: number,
		parentTaskMark: string
	): { childLines: string[]; childLinesToRemove: number[] } {
		const childLines: string[] = [];
		const childLinesToRemove: number[] = [];

		// Check if the parent task is completed
		const parentIsCompleted = this.isCompletedTaskMark(parentTaskMark);

		// Don't remove the parent task by default, we're just copying it
		// Only add parent to remove if it's a completed task (and you want to remove completed tasks)
		// Change false to true if you want to remove parent tasks
		const shouldRemoveParent = parentIsCompleted && false;
		if (shouldRemoveParent) {
			childLinesToRemove.push(taskLine);
		}

		// Process child tasks according to moveMode
		if (this.moveMode === "all") {
			// Move all subtasks
			for (let i = taskLine + 1; i < lines.length; i++) {
				const line = lines[i];
				const lineIndent = this.getIndentation(line);

				if (lineIndent <= currentIndent) {
					break;
				}

				childLines.push(this.completeTaskIfNeeded(line));
				childLinesToRemove.push(i);
			}
		} else if (
			this.moveMode === "directChildren" ||
			this.moveMode === "allCompleted"
		) {
			// First collect all child tasks
			const childTasks: {
				line: string;
				index: number;
				indent: number;
				isCompleted: boolean;
			}[] = [];

			for (let i = taskLine + 1; i < lines.length; i++) {
				const line = lines[i];
				const lineIndent = this.getIndentation(line);

				if (lineIndent <= currentIndent) {
					break;
				}

				// Check if this is a task with a status
				const taskMatch = line.match(/\[(.)]/);
				const isCompleted = taskMatch
					? this.isCompletedTaskMark(taskMatch[1])
					: false;

				childTasks.push({
					line,
					index: i,
					indent: lineIndent,
					isCompleted,
				});
			}

			// Process based on mode
			if (this.moveMode === "allCompleted") {
				// Include all completed tasks and their children
				for (let i = 0; i < childTasks.length; i++) {
					const task = childTasks[i];
					if (task.isCompleted) {
						// Add this completed task
						childLines.push(this.completeTaskIfNeeded(task.line));
						childLinesToRemove.push(task.index);

						// Add all of its child tasks regardless of completion
						const taskIndent = task.indent;
						for (let j = i + 1; j < childTasks.length; j++) {
							const childTask = childTasks[j];
							if (childTask.indent <= taskIndent) {
								break; // Exit when we reach a task with same or lower indent
							}

							childLines.push(
								this.completeTaskIfNeeded(childTask.line)
							);
							childLinesToRemove.push(childTask.index);
						}
					}
				}
			} else if (this.moveMode === "directChildren") {
				// Find the minimum indent level which represents direct children
				let minIndent = Number.MAX_SAFE_INTEGER;
				for (const task of childTasks) {
					if (
						task.indent < minIndent &&
						task.indent > currentIndent
					) {
						minIndent = task.indent;
					}
				}

				// Process direct children
				for (let i = 0; i < childTasks.length; i++) {
					const task = childTasks[i];

					// Check if it's a direct child and completed
					if (task.indent === minIndent && task.isCompleted) {
						// Add this direct child
						childLines.push(this.completeTaskIfNeeded(task.line));
						childLinesToRemove.push(task.index);

						// Add all of its child tasks regardless of completion
						const taskIndent = task.indent;
						for (let j = i + 1; j < childTasks.length; j++) {
							const childTask = childTasks[j];
							if (childTask.indent <= taskIndent) {
								break; // Exit when we reach a task with same or lower indent
							}

							childLines.push(
								this.completeTaskIfNeeded(childTask.line)
							);
							childLinesToRemove.push(childTask.index);
						}
					}
				}
			}
		}

		return { childLines, childLinesToRemove };
	}

	private removeCompletedTasksFromSourceFile() {
		if (
			!this.plugin.linesToRemove ||
			this.plugin.linesToRemove.length === 0
		) {
			return;
		}

		const content = this.editor.getValue();
		const lines = content.split("\n");

		// Get lines to remove (sorted in descending order to avoid index shifting)
		const linesToRemove = [...this.plugin.linesToRemove].sort(
			(a, b) => b - a
		);

		// Create a transaction to remove the lines
		this.editor.transaction({
			changes: linesToRemove.map((lineIndex) => {
				// Calculate start and end positions
				const startPos = {
					line: lineIndex,
					ch: 0,
				};

				// For the end position, use the next line's start or end of document
				const endPos =
					lineIndex + 1 < lines.length
						? { line: lineIndex + 1, ch: 0 }
						: { line: lineIndex, ch: lines[lineIndex].length };

				return {
					from: startPos,
					to: endPos,
					text: "",
				};
			}),
		});

		// Clear the lines to remove
		this.plugin.linesToRemove = [];
	}

	private adjustIndentation(
		taskContent: string,
		targetIndent: number
	): string {
		const lines = taskContent.split("\n");

		// Get the indentation of the first line
		const firstLineIndent = this.getIndentation(lines[0]);

		// Calculate the indentation difference
		const indentDiff = targetIndent - firstLineIndent;

		if (indentDiff === 0) {
			return taskContent;
		}

		// Adjust indentation for all lines
		const indentStr =
			indentDiff > 0
				? buildIndentString(this.app).repeat(indentDiff)
				: "";

		return lines
			.map((line) => {
				if (indentDiff > 0) {
					// Add indentation
					return indentStr + line;
				} else {
					// Remove indentation
					const currentIndent = this.getIndentation(line);
					const newIndent = Math.max(0, currentIndent + indentDiff);
					return (
						buildIndentString(this.app).repeat(newIndent) +
						line.substring(currentIndent)
					);
				}
			})
			.join("\n");
	}

	// Add marker to task (version, date, or custom)
	private addMarkerToTask(taskLine: string, isRoot = false): string {
		const {
			taskMarkerType,
			versionMarker,
			dateMarker,
			customMarker,
			withCurrentFileLink,
		} = this.plugin.settings.completedTaskMover;

		// Extract blockid if exists
		const blockidMatch = taskLine.match(/^(.*?)(?:\s+^[a-zA-Z0-9]{6}$)?$/);
		if (!blockidMatch) return taskLine;

		const mainContent = blockidMatch[1].trimEnd();
		const blockid = blockidMatch[2]?.trim();

		// Create base task line with marker
		let markedTaskLine = mainContent;

		// Basic check to ensure the task line doesn't already have this marker
		if (
			!mainContent.includes(versionMarker) &&
			!mainContent.includes(dateMarker) &&
			!mainContent.includes(this.processCustomMarker(customMarker))
		) {
			switch (taskMarkerType) {
				case "version":
					markedTaskLine = `${mainContent} ${versionMarker}`;
					break;
				case "date":
					markedTaskLine = `${mainContent} ${this.processDateMarker(
						dateMarker
					)}`;
					break;
				case "custom":
					markedTaskLine = `${mainContent} ${this.processCustomMarker(
						customMarker
					)}`;
					break;
				default:
					markedTaskLine = mainContent;
			}
		}

		// Add link to the current file if setting is enabled and this is a root task
		if (withCurrentFileLink && isRoot) {
			const currentFile = this.sourceFile;
			const link = this.app.fileManager.generateMarkdownLink(
				currentFile,
				currentFile.path
			);
			markedTaskLine = `${markedTaskLine} from ${link}`;
		}

		// Add back the blockid if it exists
		if (blockid) {
			markedTaskLine = `${markedTaskLine} ${blockid}`;
		}

		return markedTaskLine;
	}

	// Process custom marker with date variables
	private processCustomMarker(marker: string): string {
		// Replace {{DATE:format}} with formatted date
		return marker.replace(/\{\{DATE:([^}]+)\}\}/g, (match, format) => {
			return moment().format(format);
		});
	}

	// Process date marker with {{date}} placeholder
	private processDateMarker(marker: string): string {
		return marker.replace(/\{\{date\}\}/g, () => {
			return moment().format("YYYY-MM-DD");
		});
	}

	// Check if a task mark represents a completed task
	private isCompletedTaskMark(mark: string): boolean {
		const completedMarks =
			this.plugin.settings.taskStatuses.completed?.split("|") || [
				"x",
				"X",
			];

		// If treatAbandonedAsCompleted is enabled, also consider abandoned tasks as completed
		if (this.plugin.settings.completedTaskMover.treatAbandonedAsCompleted) {
			const abandonedMarks =
				this.plugin.settings.taskStatuses.abandoned?.split("|") || [
					"-",
				];
			return (
				completedMarks.includes(mark) || abandonedMarks.includes(mark)
			);
		}

		return completedMarks.includes(mark);
	}

	// Complete tasks if the setting is enabled
	private completeTaskIfNeeded(taskLine: string): string {
		// If completeAllMovedTasks is not enabled, return the original line
		if (!this.plugin.settings.completedTaskMover.completeAllMovedTasks) {
			return taskLine;
		}

		// Check if it's a task line with checkbox
		const taskMatch = taskLine.match(/^(\s*(?:-|\d+\.|\*)\s+\[)(.)(].*)$/);
		if (!taskMatch) {
			return taskLine; // Not a task line, return as is
		}

		// Get the completion symbol (first character in completed status)
		const completedMark =
			this.plugin.settings.taskStatuses.completed?.split("|")[0] || "x";

		// Replace the current mark with the completed mark
		return `${taskMatch[1]}${completedMark}${taskMatch[3]}`;
	}
}

/**
 * Command to move the completed tasks to another file
 */
export function moveCompletedTasksCommand(
	checking: boolean,
	editor: Editor,
	ctx: MarkdownView | MarkdownFileInfo,
	plugin: TaskProgressBarPlugin,
	moveMode: "allCompleted" | "directChildren" | "all"
): boolean {
	// Get the current file
	const currentFile = ctx.file;

	if (checking) {
		// If checking, return true if we're in a markdown file
		if (!currentFile || currentFile.extension !== "md") {
			return false;
		}

		// Check if there's a selection with at least one task line
		if (editor.somethingSelected()) {
			const selection = editor.getSelection();
			const lines = selection.split("\n");
			// Check if any line is a task
			for (const line of lines) {
				if (line.match(/^\s*(-|\d+\.|\*) \[(.)\]/i)) {
					return true;
				}
			}
		}

		// If no selection, check if cursor is on a task line
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		return line.match(/^\s*(-|\d+\.|\*) \[(.)\]/i) !== null;
	}

	// Execute the command
	if (!currentFile) {
		new Notice(t("No active file found"));
		return false;
	}

	// Collect task lines to move
	const taskLines: number[] = [];

	if (editor.somethingSelected()) {
		// If there's a selection, collect all task lines within the selection
		const selection = editor.listSelections()[0];
		const startLine = selection.anchor.line;
		const endLine = selection.head.line;

		// Ensure startLine is before endLine
		const minLine = Math.min(startLine, endLine);
		const maxLine = Math.max(startLine, endLine);

		for (let i = minLine; i <= maxLine; i++) {
			const line = editor.getLine(i);
			if (line.match(/^\s*(-|\d+\.|\*) \[(.)\]/i)) {
				taskLines.push(i);
			}
		}
	} else {
		// If no selection, use the current cursor line
		const cursor = editor.getCursor();
		taskLines.push(cursor.line);
	}

	// If no task lines found, show notice and return
	if (taskLines.length === 0) {
		new Notice(t("No tasks found to move"));
		return false;
	}

	// Open modal to select target file
	new CompletedTaskFileSelectionModal(
		plugin.app,
		plugin,
		editor,
		currentFile,
		taskLines,
		moveMode
	).open();

	return true;
}
