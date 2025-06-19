/**
 * Message types for task indexing worker communication
 */

import { CachedMetadata, FileStats, ListItemCache } from "obsidian";
import { Task } from "../../types/task";
import { MetadataFormat } from "../taskUtil";
import { FileParsingConfiguration } from "../../common/setting-definition";

/**
 * Command to parse tasks from a file
 */
export interface ParseTasksCommand {
	type: "parseTasks";

	/** The file path being processed */
	filePath: string;
	/** The file contents to parse */
	content: string;
	/** File extension to determine parser type */
	fileExtension: string;
	/** File stats information */
	stats: FileStats;
	/** Additional metadata from Obsidian cache */
	metadata?: {
		/** List items from Obsidian's metadata cache */
		listItems?: ListItemCache[];
		/** Full file metadata cache */
		fileCache?: CachedMetadata;
	};
	/** Settings for the task indexer */
	settings: {
		preferMetadataFormat: "dataview" | "tasks";
		useDailyNotePathAsDate: boolean;
		dailyNoteFormat: string;
		useAsDateType: "due" | "start" | "scheduled";
		dailyNotePath: string;
		ignoreHeading: string;
		globalFilter: string;
		focusHeading: string;
		fileParsingConfig?: FileParsingConfiguration;
	};
}

/**
 * Command to batch index multiple files
 */
export interface BatchIndexCommand {
	type: "batchIndex";

	/** Files to process in batch */
	files: {
		/** The file path */
		path: string;
		/** The file content */
		content: string;
		/** File extension to determine parser type */
		extension: string;
		/** File stats */
		stats: FileStats;
		/** Optional metadata */
		metadata?: {
			listItems?: ListItemCache[];
			fileCache?: CachedMetadata;
		};
	}[];
	/** Settings for the task indexer */
	settings: {
		preferMetadataFormat: "dataview" | "tasks";
		useDailyNotePathAsDate: boolean;
		dailyNoteFormat: string;
		useAsDateType: "due" | "start" | "scheduled";
		dailyNotePath: string;
		ignoreHeading: string;
		globalFilter: string;
		focusHeading: string;
		fileParsingConfig?: FileParsingConfiguration;
	};
}

/**
 * Available commands that can be sent to the worker
 */
export type IndexerCommand = ParseTasksCommand | BatchIndexCommand;

/**
 * Result of task parsing
 */
export interface TaskParseResult {
	type: "parseResult";

	/** Path of the file that was processed */
	filePath: string;
	/** Tasks extracted from the file */
	tasks: Task[];
	/** Statistics about the parsing operation */
	stats: {
		/** Total number of tasks found */
		totalTasks: number;
		/** Number of completed tasks */
		completedTasks: number;
		/** Time taken to process in milliseconds */
		processingTimeMs: number;
	};
}

/**
 * Result of batch indexing
 */
export interface BatchIndexResult {
	type: "batchResult";

	/** Results for each file processed */
	results: {
		/** File path */
		filePath: string;
		/** Number of tasks found */
		taskCount: number;
	}[];
	/** Aggregated statistics */
	stats: {
		/** Total number of files processed */
		totalFiles: number;
		/** Total number of tasks found across all files */
		totalTasks: number;
		/** Total processing time in milliseconds */
		processingTimeMs: number;
	};
}

/**
 * Error response
 */
export interface ErrorResult {
	type: "error";

	/** Error message */
	error: string;
	/** File path that caused the error (if available) */
	filePath?: string;
}

/**
 * All possible results from the worker
 */
export type IndexerResult = TaskParseResult | BatchIndexResult | ErrorResult;

/**
 * Custom settings for the task worker
 */

/**
 * Enhanced project data computed by TaskParsingService
 */
export interface EnhancedProjectData {
	/** File path to project mapping */
	fileProjectMap: Record<
		string,
		{
			project: string;
			source: string;
			readonly: boolean;
		}
	>;
	/** File path to enhanced metadata mapping */
	fileMetadataMap: Record<string, Record<string, any>>;
	/** Computed project configuration data */
	projectConfigMap: Record<string, Record<string, any>>;
}

export type TaskWorkerSettings = {
	preferMetadataFormat: MetadataFormat;
	useDailyNotePathAsDate: boolean;
	dailyNoteFormat: string;
	useAsDateType: "due" | "start" | "scheduled";
	dailyNotePath: string;
	ignoreHeading: string;
	globalFilter: string;
	focusHeading: string;

	// Enhanced project configuration (basic config for fallback)
	projectConfig?: {
		enableEnhancedProject: boolean;
		pathMappings: Array<{
			pathPattern: string;
			projectName: string;
			enabled: boolean;
		}>;
		metadataConfig: {
			metadataKey: string;
			inheritFromFrontmatter: boolean;
			inheritFromFrontmatterForSubtasks: boolean;
			enabled: boolean;
		};
		configFile: {
			fileName: string;
			searchRecursively: boolean;
			enabled: boolean;
		};
	};

	// Pre-computed enhanced project data from TaskParsingService
	enhancedProjectData?: EnhancedProjectData;

	// File parsing configuration for metadata and tag-based task extraction
	fileParsingConfig?: FileParsingConfiguration;
};
