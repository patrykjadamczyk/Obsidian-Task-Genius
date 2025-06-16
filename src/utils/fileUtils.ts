import { App, getFrontMatterInfo, TFile } from "obsidian";
import { QuickCaptureOptions } from "../editor-ext/quickCapture";
import { moment } from "obsidian";

/**
 * Sanitize filename by replacing unsafe characters with safe alternatives
 * @param filename - The filename to sanitize
 * @returns The sanitized filename
 */
function sanitizeFilename(filename: string): string {
	// Replace unsafe characters with safe alternatives
	return filename
		.replace(/[<>:"|*?\\]/g, "-") // Replace unsafe chars with dash
		.replace(/\//g, "-") // Replace forward slash with dash
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim(); // Remove leading/trailing whitespace
}

/**
 * Process file path with date templates
 * Replaces {{DATE:format}} patterns with current date formatted using moment.js
 * Note: Use file-system safe formats (avoid characters like : < > | " * ? \)
 * @param filePath - The file path that may contain date templates
 * @returns The processed file path with date templates replaced
 */
export function processDateTemplates(filePath: string): string {
	// Match patterns like {{DATE:YYYY-MM-DD}} or {{date:YYYY-MM-DD-HHmm}}
	const dateTemplateRegex = /\{\{DATE?:([^}]+)\}\}/gi;

	return filePath.replace(dateTemplateRegex, (match, format) => {
		try {
			// Check if format is empty or only whitespace
			if (!format || format.trim() === "") {
				return match; // Return original match for empty formats
			}

			// Use moment to format the current date with the specified format
			const formattedDate = moment().format(format);
			// Sanitize the result to ensure it's safe for file systems
			return sanitizeFilename(formattedDate);
		} catch (error) {
			console.warn(`Invalid date format in template: ${format}`, error);
			// Return the original match if formatting fails
			return match;
		}
	});
}

// Save the captured content to the target file
export async function saveCapture(
	app: App,
	content: string,
	options: QuickCaptureOptions
): Promise<void> {
	const {
		targetFile,
		appendToFile,
		targetType,
		targetHeading,
		dailyNoteSettings,
	} = options;

	let filePath: string;

	// Determine the target file path based on target type
	if (targetType === "daily-note" && dailyNoteSettings) {
		// Generate daily note file path
		const dateStr = moment().format(dailyNoteSettings.format);
		const sanitizedDateStr = sanitizeFilename(dateStr);
		const fileName = `${sanitizedDateStr}.md`;
		filePath = dailyNoteSettings.folder
			? `${dailyNoteSettings.folder}/${fileName}`
			: fileName;
	} else {
		// Use fixed file path
		const rawFilePath = targetFile || "Quick Capture.md";
		filePath = processDateTemplates(rawFilePath);
	}

	let file = app.vault.getFileByPath(filePath);

	if (!file) {
		// Create directory structure if needed
		const pathParts = filePath.split("/");
		if (pathParts.length > 1) {
			const dirPath = pathParts.slice(0, -1).join("/");
			try {
				await app.vault.createFolder(dirPath);
			} catch (e) {
				// Directory might already exist, ignore error
			}
		}

		// Create initial content for new file
		let initialContent = "";

		// If it's a daily note and has a template, use the template
		if (targetType === "daily-note" && dailyNoteSettings?.template) {
			const templateFile = app.vault.getFileByPath(
				dailyNoteSettings.template
			);
			if (templateFile instanceof TFile) {
				try {
					initialContent = await app.vault.read(templateFile);
					// Process date templates in the template content
					initialContent = processDateTemplates(initialContent);
				} catch (e) {
					console.warn("Failed to read template file:", e);
				}
			}
		}

		// Add content based on append mode and heading
		if (targetHeading) {
			// If heading is specified, add content under that heading
			if (initialContent) {
				// Check if heading already exists in template
				const headingRegex = new RegExp(
					`^#{1,6}\\s+${targetHeading.replace(
						/[.*+?^${}()|[\]\\]/g,
						"\\$&"
					)}\\s*$`,
					"m"
				);
				if (headingRegex.test(initialContent)) {
					// Heading exists, add content after it
					initialContent = initialContent.replace(
						headingRegex,
						`$&\n\n${content}`
					);
				} else {
					// Heading doesn't exist, add it with content
					initialContent += `\n\n## ${targetHeading}\n\n${content}`;
				}
			} else {
				initialContent = `## ${targetHeading}\n\n${content}`;
			}
		} else {
			// No specific heading
			if (appendToFile === "prepend") {
				initialContent = initialContent
					? `${content}\n\n${initialContent}`
					: content;
			} else {
				initialContent = initialContent
					? `${initialContent}\n\n${content}`
					: content;
			}
		}

		// Create the file
		file = await app.vault.create(filePath, initialContent);
	} else if (file instanceof TFile) {
		// Append or replace content in existing file
		await app.vault.process(file, (data) => {
			// If heading is specified, try to add content under that heading
			if (targetHeading) {
				return addContentUnderHeading(
					data,
					content,
					targetHeading,
					appendToFile || "append"
				);
			}

			// Original logic for no heading specified
			switch (appendToFile) {
				case "append": {
					// Get frontmatter information using Obsidian API
					const fmInfo = getFrontMatterInfo(data);

					// Add a newline before the new content if needed
					const separator = data.endsWith("\n") ? "" : "\n";

					if (fmInfo.exists) {
						// If frontmatter exists, use the contentStart position to append after it
						const contentStartPos = fmInfo.contentStart;

						if (contentStartPos !== undefined) {
							const contentBeforeFrontmatter = data.slice(
								0,
								contentStartPos
							);
							const contentAfterFrontmatter =
								data.slice(contentStartPos);

							return (
								contentBeforeFrontmatter +
								contentAfterFrontmatter +
								separator +
								content
							);
						} else {
							// Fallback if we can't get the exact position
							return data + separator + content;
						}
					} else {
						// No frontmatter, just append to the end
						return data + separator + content;
					}
				}
				case "prepend": {
					// Get frontmatter information
					const fmInfo = getFrontMatterInfo(data);
					const separator = "\n";

					if (fmInfo.exists && fmInfo.contentStart !== undefined) {
						// Insert after frontmatter but before content
						return (
							data.slice(0, fmInfo.contentStart) +
							content +
							separator +
							data.slice(fmInfo.contentStart)
						);
					} else {
						// No frontmatter, prepend to beginning
						return content + separator + data;
					}
				}
				case "replace":
				default:
					return content;
			}
		});
	} else {
		throw new Error("Target is not a file");
	}

	return;
}

/**
 * Add content under a specific heading in markdown text
 * @param data - The original markdown content
 * @param content - The content to add
 * @param heading - The heading to add content under
 * @param mode - How to add the content (append/prepend)
 * @returns The modified markdown content
 */
function addContentUnderHeading(
	data: string,
	content: string,
	heading: string,
	mode: "append" | "prepend" | "replace"
): string {
	const lines = data.split("\n");
	const headingRegex = new RegExp(
		`^(#{1,6})\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
		"i"
	);

	let headingIndex = -1;
	let headingLevel = 0;

	// Find the target heading
	for (let i = 0; i < lines.length; i++) {
		const match = lines[i].match(headingRegex);
		if (match) {
			headingIndex = i;
			headingLevel = match[1].length;
			break;
		}
	}

	if (headingIndex === -1) {
		// Heading not found, add it at the end
		const separator = data.endsWith("\n") ? "" : "\n";
		return `${data}${separator}\n## ${heading}\n\n${content}`;
	}

	// Find the end of this section (next heading of same or higher level)
	let sectionEndIndex = lines.length;
	for (let i = headingIndex + 1; i < lines.length; i++) {
		const line = lines[i];
		const headingMatch = line.match(/^(#{1,6})\s+/);
		if (headingMatch && headingMatch[1].length <= headingLevel) {
			sectionEndIndex = i;
			break;
		}
	}

	// Find the insertion point within the section
	let insertIndex: number;
	if (mode === "prepend") {
		// Insert right after the heading (skip empty lines)
		insertIndex = headingIndex + 1;
		while (
			insertIndex < sectionEndIndex &&
			lines[insertIndex].trim() === ""
		) {
			insertIndex++;
		}
	} else {
		// Insert at the end of the section (before next heading)
		insertIndex = sectionEndIndex;
		// Skip trailing empty lines in the section
		while (
			insertIndex > headingIndex + 1 &&
			lines[insertIndex - 1].trim() === ""
		) {
			insertIndex--;
		}
	}

	// Insert the content
	const contentLines = content.split("\n");
	const result = [
		...lines.slice(0, insertIndex),
		"", // Add empty line before content
		...contentLines,
		"", // Add empty line after content
		...lines.slice(insertIndex),
	];

	return result.join("\n");
}
