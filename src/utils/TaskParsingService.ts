/**
 * Task Parsing Service
 *
 * Provides enhanced task parsing with project configuration support for main thread operations.
 * This service is designed to complement the Worker-based parsing system by providing:
 * 
 * 1. File system access for project configuration files
 * 2. Frontmatter metadata resolution 
 * 3. Enhanced project detection that requires file system traversal
 * 
 * Note: The bulk of task parsing is handled by the Worker system, which already
 * includes basic project configuration support. This service is for cases where
 * main thread file system access is required.
 */

import { Vault, MetadataCache } from "obsidian";
import { MarkdownTaskParser } from "./workers/ConfigurableTaskParser";
import {
	ProjectConfigManager,
	ProjectConfigManagerOptions,
} from "./ProjectConfigManager";
import { TaskParserConfig, EnhancedTask } from "../types/TaskParserConfig";
import { Task, TgProject } from "../types/task";

export interface TaskParsingServiceOptions {
	vault: Vault;
	metadataCache: MetadataCache;
	parserConfig: TaskParserConfig;
	projectConfigOptions?: {
		configFileName: string;
		searchRecursively: boolean;
		metadataKey: string;
		pathMappings: Array<{
			pathPattern: string;
			projectName: string;
			enabled: boolean;
		}>;
		metadataMappings: Array<{
			sourceKey: string;
			targetKey: string;
			enabled: boolean;
		}>;
		defaultProjectNaming: {
			strategy: "filename" | "foldername" | "metadata";
			metadataKey?: string;
			stripExtension?: boolean;
			enabled: boolean;
		};
	};
}

export class TaskParsingService {
	private parser: MarkdownTaskParser;
	private projectConfigManager?: ProjectConfigManager;
	private vault: Vault;
	private metadataCache: MetadataCache;

	constructor(options: TaskParsingServiceOptions) {
		this.vault = options.vault;
		this.metadataCache = options.metadataCache;
		this.parser = new MarkdownTaskParser(options.parserConfig);

		// Initialize project config manager if enhanced project is enabled
		if (
			options.parserConfig.projectConfig?.enableEnhancedProject &&
			options.projectConfigOptions
		) {
			this.projectConfigManager = new ProjectConfigManager({
				vault: options.vault,
				metadataCache: options.metadataCache,
				...options.projectConfigOptions,
			});
		}
	}

	/**
	 * Parse tasks from content with enhanced project support
	 */
	async parseTasksFromContent(
		content: string,
		filePath: string
	): Promise<EnhancedTask[]> {
		let fileMetadata: Record<string, any> | undefined;
		let projectConfigData: Record<string, any> | undefined;
		let tgProject: TgProject | undefined;

		// Get enhanced metadata if project config manager is available
		if (this.projectConfigManager) {
			try {
				// Get file metadata (frontmatter)
				fileMetadata =
					this.projectConfigManager.getFileMetadata(filePath) ||
					undefined;

				// Get project configuration data
				projectConfigData =
					(await this.projectConfigManager.getProjectConfig(
						filePath
					)) || undefined;

				// Determine tgProject
				tgProject = await this.projectConfigManager.determineTgProject(
					filePath
				);
			} catch (error) {
				console.warn(
					`Failed to get enhanced metadata for ${filePath}:`,
					error
				);
			}
		}

		// Parse tasks with enhanced data
		return this.parser.parse(
			content,
			filePath,
			fileMetadata,
			projectConfigData,
			tgProject
		);
	}

	/**
	 * Parse tasks and return legacy Task format for compatibility
	 */
	async parseTasksFromContentLegacy(
		content: string,
		filePath: string
	): Promise<Task[]> {
		let fileMetadata: Record<string, any> | undefined;
		let projectConfigData: Record<string, any> | undefined;
		let tgProject: TgProject | undefined;

		// Get enhanced metadata if project config manager is available
		if (this.projectConfigManager) {
			try {
				fileMetadata =
					this.projectConfigManager.getFileMetadata(filePath) ||
					undefined;
				projectConfigData =
					(await this.projectConfigManager.getProjectConfig(
						filePath
					)) || undefined;
				tgProject = await this.projectConfigManager.determineTgProject(
					filePath
				);
			} catch (error) {
				console.warn(
					`Failed to get enhanced metadata for ${filePath}:`,
					error
				);
			}
		}

		// Parse tasks with enhanced data
		return this.parser.parseLegacy(
			content,
			filePath,
			fileMetadata,
			projectConfigData,
			tgProject
		);
	}

	/**
	 * Parse a single task line
	 */
	async parseTaskLine(
		line: string,
		filePath: string,
		lineNumber: number
	): Promise<Task | null> {
		const tasks = await this.parseTasksFromContentLegacy(line, filePath);

		if (tasks.length > 0) {
			const task = tasks[0];
			// Override line number to match the expected behavior
			task.line = lineNumber;
			return task;
		}

		return null;
	}

	/**
	 * Get enhanced metadata for a file
	 */
	async getEnhancedMetadata(filePath: string): Promise<Record<string, any>> {
		if (!this.projectConfigManager) {
			return {};
		}

		try {
			return await this.projectConfigManager.getEnhancedMetadata(
				filePath
			);
		} catch (error) {
			console.warn(
				`Failed to get enhanced metadata for ${filePath}:`,
				error
			);
			return {};
		}
	}

	/**
	 * Get tgProject for a file
	 */
	async getTgProject(filePath: string): Promise<TgProject | undefined> {
		if (!this.projectConfigManager) {
			return undefined;
		}

		try {
			return await this.projectConfigManager.determineTgProject(filePath);
		} catch (error) {
			console.warn(
				`Failed to determine tgProject for ${filePath}:`,
				error
			);
			return undefined;
		}
	}

	/**
	 * Clear project configuration cache
	 */
	clearProjectConfigCache(filePath?: string): void {
		if (this.projectConfigManager) {
			this.projectConfigManager.clearCache(filePath);
		}
	}

	/**
	 * Update parser configuration
	 */
	updateParserConfig(config: TaskParserConfig): void {
		this.parser = new MarkdownTaskParser(config);
	}

	/**
	 * Update project configuration options
	 */
	updateProjectConfigOptions(
		options: Partial<ProjectConfigManagerOptions>
	): void {
		if (this.projectConfigManager) {
			this.projectConfigManager.updateOptions(options);
		}
	}

	/**
	 * Enable or disable enhanced project support
	 */
	setEnhancedProjectEnabled(
		enabled: boolean,
		projectConfigOptions?: {
			configFileName: string;
			searchRecursively: boolean;
			metadataKey: string;
			pathMappings: Array<{
				pathPattern: string;
				projectName: string;
				enabled: boolean;
			}>;
			metadataMappings: Array<{
				sourceKey: string;
				targetKey: string;
				enabled: boolean;
			}>;
			defaultProjectNaming: {
				strategy: "filename" | "foldername" | "metadata";
				metadataKey?: string;
				stripExtension?: boolean;
				enabled: boolean;
			};
		}
	): void {
		if (enabled && projectConfigOptions) {
			// Create or update project config manager
			if (!this.projectConfigManager) {
				this.projectConfigManager = new ProjectConfigManager({
					vault: this.vault,
					metadataCache: this.metadataCache,
					...projectConfigOptions,
				});
			} else {
				this.projectConfigManager.updateOptions(projectConfigOptions);
			}
		} else if (!enabled) {
			// Disable project config manager
			this.projectConfigManager = undefined;
		}
	}

	/**
	 * Check if enhanced project support is enabled
	 */
	isEnhancedProjectEnabled(): boolean {
		return !!this.projectConfigManager;
	}

	/**
	 * Pre-compute enhanced project data for all files in the vault
	 * This is designed to be called before Worker processing to provide
	 * complete project information that requires file system access
	 */
	async computeEnhancedProjectData(filePaths: string[]): Promise<import("./workers/TaskIndexWorkerMessage").EnhancedProjectData> {
		if (!this.projectConfigManager) {
			return {
				fileProjectMap: {},
				fileMetadataMap: {},
				projectConfigMap: {},
			};
		}

		const fileProjectMap: Record<string, {
			project: string;
			source: string;
			readonly: boolean;
		}> = {};
		const fileMetadataMap: Record<string, Record<string, any>> = {};
		const projectConfigMap: Record<string, Record<string, any>> = {};

		// Process each file to determine its project and metadata
		for (const filePath of filePaths) {
			try {
				// Get tgProject for this file
				const tgProject = await this.projectConfigManager.determineTgProject(filePath);
				if (tgProject) {
					fileProjectMap[filePath] = {
						project: tgProject.name,
						source: tgProject.source || tgProject.type,
						readonly: tgProject.readonly ?? true,
					};
				}

				// Get enhanced metadata for this file
				const enhancedMetadata = await this.projectConfigManager.getEnhancedMetadata(filePath);
				if (Object.keys(enhancedMetadata).length > 0) {
					fileMetadataMap[filePath] = enhancedMetadata;
				}

				// Get project config for this file's directory
				const projectConfig = await this.projectConfigManager.getProjectConfig(filePath);
				if (projectConfig && Object.keys(projectConfig).length > 0) {
					// Use directory path as key for project config
					const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
					projectConfigMap[dirPath] = projectConfig;
				}
			} catch (error) {
				console.warn(`Failed to compute enhanced project data for ${filePath}:`, error);
			}
		}

		return {
			fileProjectMap,
			fileMetadataMap,
			projectConfigMap,
		};
	}

	/**
	 * Get enhanced project data for a specific file (for single file operations)
	 */
	async getEnhancedDataForFile(filePath: string): Promise<{
		tgProject?: import("../types/task").TgProject;
		fileMetadata?: Record<string, any>;
		projectConfigData?: Record<string, any>;
	}> {
		if (!this.projectConfigManager) {
			return {};
		}

		try {
			const [tgProject, enhancedMetadata, projectConfigData] = await Promise.all([
				this.projectConfigManager.determineTgProject(filePath),
				this.projectConfigManager.getEnhancedMetadata(filePath),
				this.projectConfigManager.getProjectConfig(filePath),
			]);

			return {
				tgProject,
				fileMetadata: Object.keys(enhancedMetadata).length > 0 ? enhancedMetadata : undefined,
				projectConfigData: projectConfigData && Object.keys(projectConfigData).length > 0 ? projectConfigData : undefined,
			};
		} catch (error) {
			console.warn(`Failed to get enhanced data for ${filePath}:`, error);
			return {};
		}
	}
}
