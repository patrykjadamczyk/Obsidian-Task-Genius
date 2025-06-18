/**
 * Canvas task updater for modifying tasks within Canvas files
 */

import { TFile, Vault } from "obsidian";
import { Task, CanvasTaskMetadata } from "../../types/task";
import { CanvasData, CanvasTextData } from "../../types/canvas";
import type TaskProgressBarPlugin from "../../index";
import { MetadataFormat } from "../taskUtil";

/**
 * Result of a Canvas task update operation
 */
export interface CanvasTaskUpdateResult {
    success: boolean;
    error?: string;
    updatedContent?: string;
}

/**
 * Utility class for updating tasks within Canvas files
 */
export class CanvasTaskUpdater {
    constructor(private vault: Vault, private plugin: TaskProgressBarPlugin) {}

    /**
     * Update a task within a Canvas file
     */
    public async updateCanvasTask(
        task: Task<CanvasTaskMetadata>,
        updatedTask: Task<CanvasTaskMetadata>
    ): Promise<CanvasTaskUpdateResult> {
        try {
            // Get the Canvas file
            const file = this.vault.getFileByPath(task.filePath);
            if (!file) {
                return {
                    success: false,
                    error: `Canvas file not found: ${task.filePath}`
                };
            }

            // Read the Canvas file content
            const content = await this.vault.read(file);
            let canvasData: CanvasData;

            try {
                canvasData = JSON.parse(content);
            } catch (parseError) {
                return {
                    success: false,
                    error: `Failed to parse Canvas JSON: ${parseError.message}`
                };
            }

            // Find the text node containing the task
            const nodeId = task.metadata.canvasNodeId;
            if (!nodeId) {
                return {
                    success: false,
                    error: "Task does not have a Canvas node ID"
                };
            }

            const textNode = canvasData.nodes.find(
                (node): node is CanvasTextData => 
                    node.type === 'text' && node.id === nodeId
            );

            if (!textNode) {
                return {
                    success: false,
                    error: `Canvas text node not found: ${nodeId}`
                };
            }

            console.log('textNode', textNode);

            // Update the task within the text node
            const updateResult = this.updateTaskInTextNode(
                textNode,
                task,
                updatedTask
            );

            if (!updateResult.success) {
                return updateResult;
            }

            // Write the updated Canvas content back to the file
            const updatedContent = JSON.stringify(canvasData, null, 2);
            console.log('updatedContent', updatedContent);
            await this.vault.modify(file, updatedContent);

            return {
                success: true,
                updatedContent
            };

        } catch (error) {
            return {
                success: false,
                error: `Error updating Canvas task: ${error.message}`
            };
        }
    }

    /**
     * Update a task within a text node's content
     */
    private updateTaskInTextNode(
        textNode: CanvasTextData,
        originalTask: Task,
        updatedTask: Task
    ): CanvasTaskUpdateResult {
        try {
            const lines = textNode.text.split('\n');
            let taskFound = false;
            let updatedLines = [...lines];

            // Find and update the task line
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Check if this line contains the original task
                if (this.isTaskLine(line) && this.lineMatchesTask(line, originalTask)) {
                    // Update the entire task line with comprehensive metadata handling
                    const updatedLine = this.updateCompleteTaskLine(line, originalTask, updatedTask);
                    updatedLines[i] = updatedLine;
                    taskFound = true;
                    break;
                }
            }

            if (!taskFound) {
                return {
                    success: false,
                    error: `Task not found in Canvas text node: ${originalTask.originalMarkdown}`
                };
            }

            // Update the text node content
            textNode.text = updatedLines.join('\n');

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: `Error updating task in text node: ${error.message}`
            };
        }
    }

    /**
     * Check if a line is a task line
     */
    private isTaskLine(line: string): boolean {
        return /^\s*[-*+]\s*\[[^\]]*\]\s*/.test(line);
    }

    /**
     * Check if a line matches a specific task
     */
    private lineMatchesTask(line: string, task: Task): boolean {
        // Remove the task status and compare the content
        const lineContent = line.replace(/^\s*[-*+]\s*\[[^\]]*\]\s*/, '').trim();
        const taskContent = task.content.trim();
        
        return lineContent === taskContent;
    }

    /**
     * Update the task status in a line
     */
    private updateTaskStatusInLine(line: string, newStatus: string): string {
        return line.replace(
            /(\s*[-*+]\s*\[)[^\]]*(\]\s*)/,
            `$1${newStatus}$2`
        );
    }

    /**
     * Update a complete task line with all metadata (comprehensive update)
     * This method mirrors the logic from TaskManager.updateTask for consistency
     */
    private updateCompleteTaskLine(
        taskLine: string,
        originalTask: Task,
        updatedTask: Task
    ): string {
        const useDataviewFormat = this.plugin.settings.preferMetadataFormat === "dataview";

        // Extract indentation
        const indentMatch = taskLine.match(/^(\s*)/);
        const indentation = indentMatch ? indentMatch[0] : "";
        let updatedLine = taskLine;

        // Update status if it exists in the updated task
        if (updatedTask.status) {
            updatedLine = updatedLine.replace(
                /(\s*[-*+]\s*\[)[^\]]*(\]\s*)/,
                `$1${updatedTask.status}$2`
            );
        }
        // Otherwise, update completion status if it changed
        else if (originalTask.completed !== updatedTask.completed) {
            const statusMark = updatedTask.completed ? "x" : " ";
            updatedLine = updatedLine.replace(
                /(\s*[-*+]\s*\[)[^\]]*(\]\s*)/,
                `$1${statusMark}$2`
            );
        }

        // Extract the checkbox part and use the new content
        const checkboxMatch = updatedLine.match(/^(\s*[-*+]\s*\[[^\]]*\]\s*)/);
        const checkboxPart = checkboxMatch ? checkboxMatch[1] : "";

        // Start with the checkbox part + new content
        updatedLine = checkboxPart + updatedTask.content;

        // Remove existing metadata (both formats)
        updatedLine = this.removeExistingMetadata(updatedLine);

        // Clean up extra spaces
        updatedLine = updatedLine.replace(/\s+/g, " ").trim();

        // Add updated metadata
        const metadata = this.buildMetadataArray(updatedTask, originalTask, useDataviewFormat);

        // Append all metadata to the line
        if (metadata.length > 0) {
            updatedLine = updatedLine.trim();
            updatedLine = `${updatedLine} ${metadata.join(" ")}`;
        }

        // Ensure indentation is preserved
        if (indentation && !updatedLine.startsWith(indentation)) {
            updatedLine = `${indentation}${updatedLine.trimStart()}`;
        }

        return updatedLine;
    }

    /**
     * Build metadata array for a task
     */
    private buildMetadataArray(
        updatedTask: Task,
        originalTask: Task,
        useDataviewFormat: boolean
    ): string[] {
        const metadata: string[] = [];

        // Helper function to format dates
        const formatDate = (date: number | undefined): string | undefined => {
            if (!date) return undefined;
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        };

        const formattedDueDate = formatDate(updatedTask.metadata.dueDate);
        const formattedStartDate = formatDate(updatedTask.metadata.startDate);
        const formattedScheduledDate = formatDate(updatedTask.metadata.scheduledDate);
        const formattedCompletedDate = formatDate(updatedTask.metadata.completedDate);

        // Helper function to check if project is readonly
        const isProjectReadonly = (task: Task): boolean => {
            return task.metadata.tgProject?.readonly === true;
        };

        // 1. Add non-project/context tags first
        if (updatedTask.metadata.tags && updatedTask.metadata.tags.length > 0) {
            const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
            const generalTags = updatedTask.metadata.tags.filter((tag) => {
                if (typeof tag !== "string") return false;
                if (tag.startsWith(`#${projectPrefix}/`)) return false;
                if (tag.startsWith("@") && updatedTask.metadata.context && tag === `@${updatedTask.metadata.context}`) return false;
                return true;
            });

            const uniqueGeneralTags = [...new Set(generalTags)]
                .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
                .filter((tag) => tag.length > 1);

            if (uniqueGeneralTags.length > 0) {
                metadata.push(...uniqueGeneralTags);
            }
        }

        // 2. Project - Only write project if it's not a read-only tgProject
        const shouldWriteProject = updatedTask.metadata.project && !isProjectReadonly(originalTask);
        if (shouldWriteProject) {
            if (useDataviewFormat) {
                const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
                const projectField = `[${projectPrefix}:: ${updatedTask.metadata.project}]`;
                if (!metadata.includes(projectField)) {
                    metadata.push(projectField);
                }
            } else {
                const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
                const projectTag = `#${projectPrefix}/${updatedTask.metadata.project}`;
                if (!metadata.includes(projectTag)) {
                    metadata.push(projectTag);
                }
            }
        }

        // 3. Context
        if (updatedTask.metadata.context) {
            if (useDataviewFormat) {
                const contextPrefix = this.plugin.settings.contextTagPrefix[this.plugin.settings.preferMetadataFormat] || "context";
                const contextField = `[${contextPrefix}:: ${updatedTask.metadata.context}]`;
                if (!metadata.includes(contextField)) {
                    metadata.push(contextField);
                }
            } else {
                const contextTag = `@${updatedTask.metadata.context}`;
                if (!metadata.includes(contextTag)) {
                    metadata.push(contextTag);
                }
            }
        }

        // 4. Priority
        if (updatedTask.metadata.priority) {
            if (useDataviewFormat) {
                let priorityValue: string | number;
                switch (updatedTask.metadata.priority) {
                    case 5: priorityValue = "highest"; break;
                    case 4: priorityValue = "high"; break;
                    case 3: priorityValue = "medium"; break;
                    case 2: priorityValue = "low"; break;
                    case 1: priorityValue = "lowest"; break;
                    default: priorityValue = updatedTask.metadata.priority;
                }
                metadata.push(`[priority:: ${priorityValue}]`);
            } else {
                let priorityMarker = "";
                switch (updatedTask.metadata.priority) {
                    case 5: priorityMarker = "🔺"; break;
                    case 4: priorityMarker = "⏫"; break;
                    case 3: priorityMarker = "🔼"; break;
                    case 2: priorityMarker = "🔽"; break;
                    case 1: priorityMarker = "⏬"; break;
                }
                if (priorityMarker) metadata.push(priorityMarker);
            }
        }

        // 5. Recurrence
        if (updatedTask.metadata.recurrence) {
            metadata.push(
                useDataviewFormat
                    ? `[repeat:: ${updatedTask.metadata.recurrence}]`
                    : `🔁 ${updatedTask.metadata.recurrence}`
            );
        }

        // 6. Start Date
        if (formattedStartDate) {
            if (!(updatedTask.metadata.useAsDateType === "start" && formatDate(originalTask.metadata.startDate) === formattedStartDate)) {
                metadata.push(
                    useDataviewFormat
                        ? `[start:: ${formattedStartDate}]`
                        : `🛫 ${formattedStartDate}`
                );
            }
        }

        // 7. Scheduled Date
        if (formattedScheduledDate) {
            if (!(updatedTask.metadata.useAsDateType === "scheduled" && formatDate(originalTask.metadata.scheduledDate) === formattedScheduledDate)) {
                metadata.push(
                    useDataviewFormat
                        ? `[scheduled:: ${formattedScheduledDate}]`
                        : `⏳ ${formattedScheduledDate}`
                );
            }
        }

        // 8. Due Date
        if (formattedDueDate) {
            if (!(updatedTask.metadata.useAsDateType === "due" && formatDate(originalTask.metadata.dueDate) === formattedDueDate)) {
                metadata.push(
                    useDataviewFormat
                        ? `[due:: ${formattedDueDate}]`
                        : `📅 ${formattedDueDate}`
                );
            }
        }

        // 9. Completion Date (only if completed)
        if (formattedCompletedDate && updatedTask.completed) {
            metadata.push(
                useDataviewFormat
                    ? `[completion:: ${formattedCompletedDate}]`
                    : `✅ ${formattedCompletedDate}`
            );
        }

        return metadata;
    }

    /**
     * Remove existing metadata from a task line
     */
    private removeExistingMetadata(line: string): string {
        let updatedLine = line;

        // Remove emoji dates
        updatedLine = updatedLine.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "");
        updatedLine = updatedLine.replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, "");
        updatedLine = updatedLine.replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, "");
        updatedLine = updatedLine.replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "");
        updatedLine = updatedLine.replace(/➕\s*\d{4}-\d{2}-\d{2}/g, "");

        // Remove dataview dates (inline field format)
        updatedLine = updatedLine.replace(/\[(?:due|🗓️)::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        updatedLine = updatedLine.replace(/\[(?:completion|✅)::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        updatedLine = updatedLine.replace(/\[(?:created|➕)::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        updatedLine = updatedLine.replace(/\[(?:start|🛫)::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        updatedLine = updatedLine.replace(/\[(?:scheduled|⏳)::\s*\d{4}-\d{2}-\d{2}\]/gi, "");

        // Remove emoji priority markers
        updatedLine = updatedLine.replace(/\s+(🔼|🔽|⏫|⏬|🔺|\[#[A-C]\])/g, "");
        // Remove dataview priority
        updatedLine = updatedLine.replace(/\[priority::\s*\w+\]/gi, "");

        // Remove emoji recurrence
        updatedLine = updatedLine.replace(/🔁\s*[^\s]+/g, "");
        // Remove dataview recurrence
        updatedLine = updatedLine.replace(/\[(?:repeat|recurrence)::\s*[^\]]+\]/gi, "");

        // Remove dataview project and context (using configurable prefixes)
        const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
        const contextPrefix = this.plugin.settings.contextTagPrefix[this.plugin.settings.preferMetadataFormat] || "@";
        updatedLine = updatedLine.replace(new RegExp(`\\[${projectPrefix}::\\s*[^\\]]+\\]`, "gi"), "");
        updatedLine = updatedLine.replace(new RegExp(`\\[${contextPrefix}::\\s*[^\\]]+\\]`, "gi"), "");

        // Remove ALL existing tags to prevent duplication
        updatedLine = updatedLine.replace(/#[^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\\s]+/g, "");
        updatedLine = updatedLine.replace(/@[^\s@]+/g, "");

        return updatedLine;
    }

    /**
     * Check if a task is a Canvas task
     */
    public static isCanvasTask(task: Task): task is Task<CanvasTaskMetadata> {
        return (task.metadata as any).sourceType === 'canvas';
    }
}
