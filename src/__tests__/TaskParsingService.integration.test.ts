/**
 * TaskParsingService Integration Tests
 *
 * Tests the complete project parsing workflow including:
 * - Task parsing with enhanced project support
 * - Integration with ProjectConfigManager
 * - Metadata mapping functionality
 * - Default project naming strategies
 * - Priority order of different project sources
 */

import { TaskParsingService, TaskParsingServiceOptions } from "../utils/TaskParsingService";
import { TaskParserConfig, MetadataParseMode } from "../types/TaskParserConfig";
import { Task, TgProject } from "../types/task";

// Mock Obsidian types (reuse from ProjectConfigManager tests)
class MockTFile {
	constructor(
		public path: string,
		public name: string,
		public parent: MockTFolder | null = null
	) {
		this.stat = { mtime: Date.now() };
	}
	stat: { mtime: number };
}

class MockTFolder {
	constructor(
		public path: string,
		public name: string,
		public parent: MockTFolder | null = null,
		public children: (MockTFile | MockTFolder)[] = []
	) {}
}

class MockVault {
	private files = new Map<string, MockTFile>();
	private fileContents = new Map<string, string>();

	addFile(path: string, content: string): MockTFile {
		const fileName = path.split('/').pop() || '';
		const file = new MockTFile(path, fileName);
		this.files.set(path, file);
		this.fileContents.set(path, content);
		return file;
	}

	addFolder(path: string): MockTFolder {
		const folderName = path.split('/').pop() || '';
		return new MockTFolder(path, folderName);
	}

	getAbstractFileByPath(path: string): MockTFile | null {
		return this.files.get(path) || null;
	}

	async read(file: MockTFile): Promise<string> {
		return this.fileContents.get(file.path) || '';
	}
}

class MockMetadataCache {
	private cache = new Map<string, any>();

	setFileMetadata(path: string, metadata: any): void {
		this.cache.set(path, { frontmatter: metadata });
	}

	getFileCache(file: MockTFile): any {
		return this.cache.get(file.path);
	}
}

describe('TaskParsingService Integration', () => {
	let vault: MockVault;
	let metadataCache: MockMetadataCache;
	let parsingService: TaskParsingService;

	const createParserConfig = (enableEnhancedProject = true): TaskParserConfig => ({
		parseMetadata: true,
		parseTags: true,
		parseComments: false,
		parseHeadings: false,
		maxIndentSize: 4,
		maxParseIterations: 1000,
		maxMetadataIterations: 100,
		maxTagLength: 100,
		maxEmojiValueLength: 200,
		maxStackOperations: 1000,
		maxStackSize: 100,
		statusMapping: {
			todo: ' ',
			done: 'x',
			cancelled: '-',
		},
		emojiMapping: {
			'📅': 'due',
			'🔺': 'priority',
		},
		metadataParseMode: MetadataParseMode.Both,
		specialTagPrefixes: {
			project: 'project',
			area: 'area',
			context: 'context',
		},
		projectConfig: enableEnhancedProject ? {
			enableEnhancedProject: true,
			pathMappings: [],
			metadataConfig: {
				metadataKey: 'project',
				inheritFromFrontmatter: true,
				enabled: true,
			},
			configFile: {
				fileName: 'project.md',
				searchRecursively: true,
				enabled: true,
			},
		} : undefined,
	});

	const createServiceOptions = (
		parserConfig: TaskParserConfig,
		customProjectOptions?: any
	): TaskParsingServiceOptions => ({
		vault: vault as any,
		metadataCache: metadataCache as any,
		parserConfig,
		projectConfigOptions: customProjectOptions || {
			configFileName: 'project.md',
			searchRecursively: true,
			metadataKey: 'project',
			pathMappings: [],
			metadataMappings: [],
			defaultProjectNaming: {
				strategy: 'filename',
				stripExtension: true,
				enabled: false,
			},
		},
	});

	beforeEach(() => {
		vault = new MockVault();
		metadataCache = new MockMetadataCache();
	});

	describe('Enhanced project parsing', () => {
		it('should parse tasks with path-based projects', async () => {
			const parserConfig = createParserConfig();
			const serviceOptions = createServiceOptions(parserConfig, {
				configFileName: 'project.md',
				searchRecursively: true,
				metadataKey: 'project',
				pathMappings: [
					{
						pathPattern: 'Work',
						projectName: 'Work Project',
						enabled: true,
					},
				],
				metadataMappings: [],
				defaultProjectNaming: {
					strategy: 'filename',
					stripExtension: true,
					enabled: false,
				},
			});

			parsingService = new TaskParsingService(serviceOptions);

			const content = `
- [ ] Complete report 📅 2024-01-15
- [x] Review documentation
- [ ] Send email to team 🔺 high
`;

			const tasks = await parsingService.parseTasksFromContentLegacy(content, 'Work/tasks.md');

			expect(tasks).toHaveLength(3);
			
			// Check that all tasks have the path-based project
			tasks.forEach(task => {
				expect(task.metadata.tgProject).toEqual({
					type: 'path',
					name: 'Work Project',
					source: 'Work',
					readonly: true,
				});
			});

			// Check specific task properties
			expect(tasks[0].description).toBe('Complete report');
			expect(tasks[0].metadata.due).toBe('2024-01-15');
			expect(tasks[0].completed).toBe(false);

			expect(tasks[1].description).toBe('Review documentation');
			expect(tasks[1].completed).toBe(true);

			expect(tasks[2].description).toBe('Send email to team');
			expect(tasks[2].metadata.priority).toBe('high');
		});

		it('should parse tasks with metadata-based projects', async () => {
			const parserConfig = createParserConfig();
			const serviceOptions = createServiceOptions(parserConfig);

			parsingService = new TaskParsingService(serviceOptions);

			vault.addFile('Personal/notes.md', '# Personal Notes');
			metadataCache.setFileMetadata('Personal/notes.md', {
				project: 'Personal Development',
				author: 'John Doe',
			});

			const content = `
- [ ] Read self-help book 📅 2024-02-01
- [ ] Exercise for 30 minutes
`;

			const tasks = await parsingService.parseTasksFromContentLegacy(content, 'Personal/notes.md');

			expect(tasks).toHaveLength(2);
			
			tasks.forEach(task => {
				expect(task.metadata.tgProject).toEqual({
					type: 'metadata',
					name: 'Personal Development',
					source: 'project',
					readonly: true,
				});
			});
		});

		it('should parse tasks with config file-based projects', async () => {
			const parserConfig = createParserConfig();
			const serviceOptions = createServiceOptions(parserConfig);

			parsingService = new TaskParsingService(serviceOptions);

			// Set up config file
			vault.addFile('Projects/project.md', 'project: Research Project');
			vault.addFile('Projects/tasks.md', '# Research Tasks');

			// Mock folder structure
			const file = vault.addFile('Projects/tasks.md', '# Research Tasks');
			const folder = vault.addFolder('Projects');
			const configFile = vault.getAbstractFileByPath('Projects/project.md');
			if (configFile) {
				folder.children.push(configFile);
				file.parent = folder;
			}

			const content = `
- [ ] Literature review
- [ ] Data collection 🔺 medium
- [ ] Analysis 📅 2024-03-15
`;

			const tasks = await parsingService.parseTasksFromContentLegacy(content, 'Projects/tasks.md');

			expect(tasks).toHaveLength(3);
			
			tasks.forEach(task => {
				expect(task.metadata.tgProject).toEqual({
					type: 'config',
					name: 'Research Project',
					source: 'project.md',
					readonly: true,
				});
			});
		});

		it('should parse tasks with default project naming', async () => {
			const parserConfig = createParserConfig();
			const serviceOptions = createServiceOptions(parserConfig, {
				configFileName: 'project.md',
				searchRecursively: true,
				metadataKey: 'project',
				pathMappings: [],
				metadataMappings: [],
				defaultProjectNaming: {
					strategy: 'filename',
					stripExtension: true,
					enabled: true,
				},
			});

			parsingService = new TaskParsingService(serviceOptions);

			const content = `
- [ ] Task without explicit project
- [x] Another completed task
`;

			const tasks = await parsingService.parseTasksFromContentLegacy(content, 'Documents/my-project-notes.md');

			expect(tasks).toHaveLength(2);
			
			tasks.forEach(task => {
				expect(task.metadata.tgProject).toEqual({
					type: 'default',
					name: 'my-project-notes',
					source: 'filename',
					readonly: true,
				});
			});
		});
	});

	describe('Metadata mappings', () => {
		it('should apply metadata mappings during parsing', async () => {
			const parserConfig = createParserConfig();
			const serviceOptions = createServiceOptions(parserConfig, {
				configFileName: 'project.md',
				searchRecursively: true,
				metadataKey: 'project',
				pathMappings: [],
				metadataMappings: [
					{
						sourceKey: 'deadline',
						targetKey: 'due',
						enabled: true,
					},
					{
						sourceKey: 'importance',
						targetKey: 'priority',
						enabled: true,
					},
				],
				defaultProjectNaming: {
					strategy: 'filename',
					stripExtension: true,
					enabled: false,
				},
			});

			parsingService = new TaskParsingService(serviceOptions);

			vault.addFile('test.md', '# Test file');
			metadataCache.setFileMetadata('test.md', {
				project: 'Test Project',
				deadline: '2024-04-01',
				importance: 'critical',
				category: 'work',
			});

			const content = `
- [ ] Important task with metadata mapping
`;

			const tasks = await parsingService.parseTasksFromContentLegacy(content, 'test.md');
			const enhancedMetadata = await parsingService.getEnhancedMetadata('test.md');

			expect(enhancedMetadata).toEqual({
				project: 'Test Project',
				deadline: '2024-04-01',
				importance: 'critical',
				category: 'work',
				due: '2024-04-01',
				priority: 'critical',
			});

			expect(tasks).toHaveLength(1);
			expect(tasks[0].metadata.tgProject).toEqual({
				type: 'metadata',
				name: 'Test Project',
				source: 'project',
				readonly: true,
			});
		});
	});

	describe('Priority order integration', () => {
		it('should prioritize path mappings over metadata and config', async () => {
			const parserConfig = createParserConfig();
			const serviceOptions = createServiceOptions(parserConfig, {
				configFileName: 'project.md',
				searchRecursively: true,
				metadataKey: 'project',
				pathMappings: [
					{
						pathPattern: 'Priority',
						projectName: 'Path Priority Project',
						enabled: true,
					},
				],
				metadataMappings: [],
				defaultProjectNaming: {
					strategy: 'filename',
					stripExtension: true,
					enabled: true,
				},
			});

			parsingService = new TaskParsingService(serviceOptions);

			// Set up competing project sources
			vault.addFile('Priority/tasks.md', '# Tasks');
			vault.addFile('Priority/project.md', 'project: Config Project');
			metadataCache.setFileMetadata('Priority/tasks.md', {
				project: 'Metadata Project',
			});

			// Mock folder structure
			const file = vault.getAbstractFileByPath('Priority/tasks.md');
			const folder = vault.addFolder('Priority');
			const configFile = vault.getAbstractFileByPath('Priority/project.md');
			if (file && configFile) {
				folder.children.push(configFile);
				file.parent = folder;
			}

			const content = `
- [ ] Task with multiple project sources
`;

			const tasks = await parsingService.parseTasksFromContentLegacy(content, 'Priority/tasks.md');

			expect(tasks).toHaveLength(1);
			expect(tasks[0].metadata.tgProject).toEqual({
				type: 'path',
				name: 'Path Priority Project',
				source: 'Priority',
				readonly: true,
			});
		});
	});

	describe('Single task parsing', () => {
		it('should parse single task line with project information', async () => {
			const parserConfig = createParserConfig();
			const serviceOptions = createServiceOptions(parserConfig, {
				configFileName: 'project.md',
				searchRecursively: true,
				metadataKey: 'project',
				pathMappings: [
					{
						pathPattern: 'SingleTask',
						projectName: 'Single Task Project',
						enabled: true,
					},
				],
				metadataMappings: [],
				defaultProjectNaming: {
					strategy: 'filename',
					stripExtension: true,
					enabled: false,
				},
			});

			parsingService = new TaskParsingService(serviceOptions);

			const taskLine = '- [ ] Single line task 📅 2024-05-01 🔺 high';
			const task = await parsingService.parseTaskLine(taskLine, 'SingleTask/note.md', 5);

			expect(task).not.toBeNull();
			expect(task!.description).toBe('Single line task');
			expect(task!.line).toBe(5);
			expect(task!.metadata.due).toBe('2024-05-01');
			expect(task!.metadata.priority).toBe('high');
			expect(task!.metadata.tgProject).toEqual({
				type: 'path',
				name: 'Single Task Project',
				source: 'SingleTask',
				readonly: true,
			});
		});
	});

	describe('Enhanced project data computation', () => {
		it('should compute enhanced project data for multiple files', async () => {
			const parserConfig = createParserConfig();
			const serviceOptions = createServiceOptions(parserConfig, {
				configFileName: 'project.md',
				searchRecursively: true,
				metadataKey: 'project',
				pathMappings: [
					{
						pathPattern: 'Work',
						projectName: 'Work Project',
						enabled: true,
					},
				],
				metadataMappings: [
					{
						sourceKey: 'deadline',
						targetKey: 'due',
						enabled: true,
					},
				],
				defaultProjectNaming: {
					strategy: 'filename',
					stripExtension: true,
					enabled: true,
				},
			});

			parsingService = new TaskParsingService(serviceOptions);

			// Set up multiple files with different project sources
			vault.addFile('Work/tasks.md', '# Work Tasks');
			vault.addFile('Personal/notes.md', '# Personal Notes');
			vault.addFile('Research/project.md', 'project: Research Project');
			vault.addFile('Research/data.md', '# Research Data');
			vault.addFile('Other/random.md', '# Random File');

			metadataCache.setFileMetadata('Personal/notes.md', {
				project: 'Personal Project',
				deadline: '2024-06-01',
			});

			// Mock folder structure for Research
			const researchFile = vault.getAbstractFileByPath('Research/data.md');
			const researchFolder = vault.addFolder('Research');
			const researchConfigFile = vault.getAbstractFileByPath('Research/project.md');
			if (researchFile && researchConfigFile) {
				researchFolder.children.push(researchConfigFile);
				researchFile.parent = researchFolder;
			}

			const filePaths = [
				'Work/tasks.md',
				'Personal/notes.md',
				'Research/data.md',
				'Other/random.md',
			];

			const enhancedData = await parsingService.computeEnhancedProjectData(filePaths);

			expect(enhancedData.fileProjectMap).toEqual({
				'Work/tasks.md': {
					project: 'Work Project',
					source: 'Work',
					readonly: true,
				},
				'Personal/notes.md': {
					project: 'Personal Project',
					source: 'project',
					readonly: true,
				},
				'Research/data.md': {
					project: 'Research Project',
					source: 'project.md',
					readonly: true,
				},
				'Other/random.md': {
					project: 'random',
					source: 'filename',
					readonly: true,
				},
			});

			expect(enhancedData.fileMetadataMap['Personal/notes.md']).toEqual({
				project: 'Personal Project',
				deadline: '2024-06-01',
				due: '2024-06-01',
			});
		});
	});

	describe('Error handling and edge cases', () => {
		it('should handle parsing errors gracefully', async () => {
			const parserConfig = createParserConfig();
			const serviceOptions = createServiceOptions(parserConfig);

			parsingService = new TaskParsingService(serviceOptions);

			// Test with malformed content
			const malformedContent = `
- [ ] Good task
- This is not a task
- [x] Another good task
`;

			const tasks = await parsingService.parseTasksFromContentLegacy(malformedContent, 'test.md');

			// Should parse valid tasks and ignore malformed lines
			expect(tasks).toHaveLength(2);
			expect(tasks[0].description).toBe('Good task');
			expect(tasks[1].description).toBe('Another good task');
		});

		it('should work without enhanced project support', async () => {
			const parserConfig = createParserConfig(false); // Disable enhanced project
			const serviceOptions: TaskParsingServiceOptions = {
				vault: vault as any,
				metadataCache: metadataCache as any,
				parserConfig,
				// No projectConfigOptions
			};

			parsingService = new TaskParsingService(serviceOptions);

			const content = `
- [ ] Task without enhanced project support
- [x] Completed task
`;

			const tasks = await parsingService.parseTasksFromContentLegacy(content, 'test.md');

			expect(tasks).toHaveLength(2);
			// Tasks should not have tgProject when enhanced project is disabled
			tasks.forEach(task => {
				expect(task.metadata.tgProject).toBeUndefined();
			});
		});

		it('should handle missing project config options gracefully', async () => {
			const parserConfig = createParserConfig();
			const serviceOptions: TaskParsingServiceOptions = {
				vault: vault as any,
				metadataCache: metadataCache as any,
				parserConfig,
				// projectConfigOptions is undefined
			};

			parsingService = new TaskParsingService(serviceOptions);

			const content = `
- [ ] Task with missing config options
`;

			const tasks = await parsingService.parseTasksFromContentLegacy(content, 'test.md');

			expect(tasks).toHaveLength(1);
			expect(tasks[0].metadata.tgProject).toBeUndefined();
		});
	});
}); 