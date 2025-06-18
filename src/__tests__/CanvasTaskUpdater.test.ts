/**
 * Tests for Canvas task updater functionality
 */

import { CanvasTaskUpdater } from '../utils/parsing/CanvasTaskUpdater';
import { Task, CanvasTaskMetadata } from '../types/task';
import { CanvasData } from '../types/canvas';

// Mock Vault and TFile
class MockVault {
    private files: Map<string, string> = new Map();

    getFileByPath(path: string) {
        if (this.files.has(path)) {
            return new MockTFile(path);
        }
        return null;
    }

    async read(file: MockTFile): Promise<string> {
        return this.files.get(file.path) || '';
    }

    async modify(file: MockTFile, content: string): Promise<void> {
        this.files.set(file.path, content);
    }

    setFileContent(path: string, content: string): void {
        this.files.set(path, content);
    }

    getFileContent(path: string): string | undefined {
        return this.files.get(path);
    }
}

class MockTFile {
    constructor(public path: string) {}

    // Add properties to make it compatible with TFile interface
    get name() {
        return this.path.split('/').pop() || '';
    }

    get extension() {
        return this.path.split('.').pop() || '';
    }
}

// Mock Plugin
class MockPlugin {
    settings = {
        preferMetadataFormat: 'tasks' as const,
        projectTagPrefix: {
            tasks: 'project',
            dataview: 'project'
        },
        contextTagPrefix: {
            tasks: '@',
            dataview: 'context'
        }
    };
}

describe('CanvasTaskUpdater', () => {
    let mockVault: MockVault;
    let mockPlugin: MockPlugin;
    let updater: CanvasTaskUpdater;

    beforeEach(() => {
        mockVault = new MockVault();
        mockPlugin = new MockPlugin();
        updater = new CanvasTaskUpdater(mockVault as any, mockPlugin as any);
    });

    describe('isCanvasTask', () => {
        it('should identify Canvas tasks correctly', () => {
            const canvasTask: Task<CanvasTaskMetadata> = {
                id: 'test-1',
                content: 'Test task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };

            const markdownTask: Task = {
                id: 'test-2',
                content: 'Test task',
                filePath: 'test.md',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: []
                }
            };

            expect(CanvasTaskUpdater.isCanvasTask(canvasTask)).toBe(true);
            expect(CanvasTaskUpdater.isCanvasTask(markdownTask)).toBe(false);
        });
    });

    describe('updateCanvasTask', () => {
        const sampleCanvasData: CanvasData = {
            nodes: [
                {
                    id: 'node-1',
                    type: 'text',
                    text: '# Test Node\n\n- [ ] Original task\n- [x] Completed task',
                    x: 100,
                    y: 100,
                    width: 300,
                    height: 200
                },
                {
                    id: 'node-2',
                    type: 'text',
                    text: '# Another Node\n\n- [ ] Another task',
                    x: 400,
                    y: 100,
                    width: 300,
                    height: 200
                }
            ],
            edges: []
        };

        beforeEach(() => {
            mockVault.setFileContent('test.canvas', JSON.stringify(sampleCanvasData, null, 2));
        });

        it('should update task status in Canvas file', async () => {
            const originalTask: Task<CanvasTaskMetadata> = {
                id: 'test-1',
                content: 'Original task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Original task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };

            const updatedTask: Task<CanvasTaskMetadata> = {
                ...originalTask,
                completed: true,
                status: 'x'
            };

            const result = await updater.updateCanvasTask(originalTask, updatedTask);

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();

            // Verify the Canvas file was updated
            const updatedContent = mockVault.getFileContent('test.canvas');
            expect(updatedContent).toBeDefined();
            
            const updatedCanvasData = JSON.parse(updatedContent!);
            const updatedNode = updatedCanvasData.nodes.find((n: any) => n.id === 'node-1');
            expect(updatedNode.text).toContain('- [x] Original task');
        });

        it('should handle missing Canvas file', async () => {
            const task: Task<CanvasTaskMetadata> = {
                id: 'test-1',
                content: 'Test task',
                filePath: 'nonexistent.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };

            const result = await updater.updateCanvasTask(task, task);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Canvas file not found');
        });

        it('should handle missing Canvas node ID', async () => {
            const task: Task<CanvasTaskMetadata> = {
                id: 'test-1',
                content: 'Test task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas'
                    // Missing canvasNodeId
                }
            };

            const result = await updater.updateCanvasTask(task, task);

            expect(result.success).toBe(false);
            expect(result.error).toContain('does not have a Canvas node ID');
        });

        it('should handle missing Canvas node', async () => {
            const task: Task<CanvasTaskMetadata> = {
                id: 'test-1',
                content: 'Test task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'nonexistent-node'
                }
            };

            const result = await updater.updateCanvasTask(task, task);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Canvas text node not found');
        });

        it('should handle invalid Canvas JSON', async () => {
            mockVault.setFileContent('test.canvas', 'invalid json');

            const task: Task<CanvasTaskMetadata> = {
                id: 'test-1',
                content: 'Test task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Test task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };

            const result = await updater.updateCanvasTask(task, task);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to parse Canvas JSON');
        });

        it('should handle task not found in node', async () => {
            const task: Task<CanvasTaskMetadata> = {
                id: 'test-1',
                content: 'Nonexistent task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Nonexistent task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };

            const result = await updater.updateCanvasTask(task, task);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Task not found in Canvas text node');
        });

        it('should update multiple different task statuses', async () => {
            // Test updating from incomplete to complete
            const task1: Task<CanvasTaskMetadata> = {
                id: 'test-1',
                content: 'Original task',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Original task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };

            const updatedTask1 = { ...task1, completed: true, status: 'x' };
            await updater.updateCanvasTask(task1, updatedTask1);

            // Test updating from complete to incomplete
            const task2: Task<CanvasTaskMetadata> = {
                id: 'test-2',
                content: 'Completed task',
                filePath: 'test.canvas',
                line: 0,
                completed: true,
                status: 'x',
                originalMarkdown: '- [x] Completed task',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };

            const updatedTask2 = { ...task2, completed: false, status: ' ' };
            const result = await updater.updateCanvasTask(task2, updatedTask2);

            expect(result.success).toBe(true);

            // Verify both updates
            const updatedContent = mockVault.getFileContent('test.canvas');
            const updatedCanvasData = JSON.parse(updatedContent!);
            const updatedNode = updatedCanvasData.nodes.find((n: any) => n.id === 'node-1');
            
            expect(updatedNode.text).toContain('- [x] Original task');
            expect(updatedNode.text).toContain('- [ ] Completed task');
        });

        it('should update task with due date metadata', async () => {
            const originalTask: Task<CanvasTaskMetadata> = {
                id: 'test-1',
                content: 'Task with due date',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Task with due date',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };

            const dueDate = new Date('2024-12-25').getTime();
            const updatedTask: Task<CanvasTaskMetadata> = {
                ...originalTask,
                content: 'Task with due date',
                metadata: {
                    ...originalTask.metadata,
                    dueDate: dueDate
                }
            };

            // First, add the task to the canvas
            const canvasData = JSON.parse(mockVault.getFileContent('test.canvas')!);
            canvasData.nodes[0].text = '# Test Node\n\n- [ ] Task with due date\n- [x] Completed task';
            mockVault.setFileContent('test.canvas', JSON.stringify(canvasData, null, 2));

            const result = await updater.updateCanvasTask(originalTask, updatedTask);

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();

            // Verify the Canvas file was updated with due date
            const updatedContent = mockVault.getFileContent('test.canvas');
            expect(updatedContent).toBeDefined();

            const updatedCanvasData = JSON.parse(updatedContent!);
            const updatedNode = updatedCanvasData.nodes.find((n: any) => n.id === 'node-1');
            expect(updatedNode.text).toContain('Task with due date 📅 2024-12-25');
        });

        it('should update task with priority and tags', async () => {
            const originalTask: Task<CanvasTaskMetadata> = {
                id: 'test-1',
                content: 'Task with metadata',
                filePath: 'test.canvas',
                line: 0,
                completed: false,
                status: ' ',
                originalMarkdown: '- [ ] Task with metadata',
                metadata: {
                    tags: [],
                    children: [],
                    sourceType: 'canvas',
                    canvasNodeId: 'node-1'
                }
            };

            const updatedTask: Task<CanvasTaskMetadata> = {
                ...originalTask,
                content: 'Task with metadata',
                metadata: {
                    ...originalTask.metadata,
                    priority: 4,
                    tags: ['#important', '#work'],
                    project: 'TestProject',
                    context: 'office'
                }
            };

            // First, add the task to the canvas
            const canvasData = JSON.parse(mockVault.getFileContent('test.canvas')!);
            canvasData.nodes[0].text = '# Test Node\n\n- [ ] Task with metadata\n- [x] Completed task';
            mockVault.setFileContent('test.canvas', JSON.stringify(canvasData, null, 2));

            const result = await updater.updateCanvasTask(originalTask, updatedTask);

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();

            // Verify the Canvas file was updated with metadata
            const updatedContent = mockVault.getFileContent('test.canvas');
            expect(updatedContent).toBeDefined();

            const updatedCanvasData = JSON.parse(updatedContent!);
            const updatedNode = updatedCanvasData.nodes.find((n: any) => n.id === 'node-1');

            // Check for tags, project, context, and priority
            expect(updatedNode.text).toContain('#important');
            expect(updatedNode.text).toContain('#work');
            expect(updatedNode.text).toContain('#project/TestProject');
            expect(updatedNode.text).toContain('@office');
            expect(updatedNode.text).toContain('⏫'); // High priority emoji
        });
    });
});
