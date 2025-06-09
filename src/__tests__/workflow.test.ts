/**
 * Workflow Tests
 *
 * Tests for workflow functionality including:
 * - Workflow definition management
 * - Stage transitions
 * - Time tracking
 * - Substage handling
 * - Context menu integration
 */

import {
	extractWorkflowInfo,
	resolveWorkflowInfo,
	determineNextStage,
	processTimestampAndCalculateTime,
	isLastWorkflowStageOrNotWorkflow,
	generateWorkflowTaskText,
	determineTaskInsertionPoint,
	handleWorkflowTransaction,
} from "../editor-ext/workflow";
import { createMockPlugin, createMockApp, createMockText } from "./mockUtils";
import {
	WorkflowDefinition,
	WorkflowStage,
} from "../common/setting-definition";
import { Text } from "@codemirror/state";
import { moment } from "obsidian";

describe("Workflow Functionality", () => {
	let mockPlugin: any;
	let mockApp: any;
	let sampleWorkflow: WorkflowDefinition;

	beforeEach(() => {
		mockApp = createMockApp();
		mockPlugin = createMockPlugin({
			workflow: {
				enableWorkflow: true,
				autoRemoveLastStageMarker: true,
				autoAddTimestamp: true,
				timestampFormat: "YYYY-MM-DD HH:mm:ss",
				removeTimestampOnTransition: true,
				calculateSpentTime: true,
				spentTimeFormat: "HH:mm:ss",
				calculateFullSpentTime: true,
				definitions: [],
				autoAddNextTask: true,
			},
		});

		// Sample workflow definition for testing
		sampleWorkflow = {
			id: "development",
			name: "Development Workflow",
			description: "A typical software development workflow",
			stages: [
				{
					id: "planning",
					name: "Planning",
					type: "linear",
					next: "development",
				},
				{
					id: "development",
					name: "Development",
					type: "cycle",
					subStages: [
						{ id: "coding", name: "Coding", next: "testing" },
						{ id: "testing", name: "Testing", next: "review" },
						{ id: "review", name: "Code Review", next: "coding" },
					],
					canProceedTo: ["deployment"],
				},
				{
					id: "deployment",
					name: "Deployment",
					type: "linear",
					next: "monitoring",
				},
				{
					id: "monitoring",
					name: "Monitoring",
					type: "terminal",
				},
			],
			metadata: {
				version: "1.0.0",
				created: "2024-01-01",
				lastModified: "2024-01-01",
			},
		};

		mockPlugin.settings.workflow.definitions = [sampleWorkflow];
	});

	describe("extractWorkflowInfo", () => {
		test("should extract workflow tag from task line", () => {
			const lineText = "- [ ] Task with workflow #workflow/development";
			const result = extractWorkflowInfo(lineText);

			expect(result).toEqual({
				workflowType: "development",
				currentStage: "root",
				subStage: undefined,
			});
		});

		test("should extract stage marker from task line", () => {
			const lineText = "- [ ] Development task [stage::development]";
			const result = extractWorkflowInfo(lineText);

			expect(result).toEqual({
				workflowType: "fromParent",
				currentStage: "development",
				subStage: undefined,
			});
		});

		test("should extract substage marker from task line", () => {
			const lineText = "- [ ] Coding task [stage::development.coding]";
			const result = extractWorkflowInfo(lineText);

			expect(result).toEqual({
				workflowType: "fromParent",
				currentStage: "development",
				subStage: "coding",
			});
		});

		test("should return null for non-workflow task", () => {
			const lineText = "- [ ] Regular task without workflow";
			const result = extractWorkflowInfo(lineText);

			expect(result).toBeNull();
		});
	});

	describe("resolveWorkflowInfo", () => {
		test("should resolve complete workflow information for root task", () => {
			const lineText = "- [ ] Root task #workflow/development";
			const doc = createMockText(lineText);
			const result = resolveWorkflowInfo(lineText, doc, 1, mockPlugin);

			expect(result).toBeTruthy();
			expect(result?.workflowType).toBe("development");
			expect(result?.currentStage.id).toBe("_root_task_");
			expect(result?.isRootTask).toBe(true);
			expect(result?.workflow.id).toBe("development");
		});

		test("should resolve workflow information for stage task", () => {
			const lineText = "  - [ ] Planning task [stage::planning]";
			const doc = createMockText(
				`- [ ] Root task #workflow/development\n${lineText}`
			);
			const result = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);

			expect(result).toBeTruthy();
			expect(result?.workflowType).toBe("development");
			expect(result?.currentStage.id).toBe("planning");
			expect(result?.isRootTask).toBe(false);
		});

		test("should resolve workflow information for substage task", () => {
			const lineText = "  - [ ] Coding task [stage::development.coding]";
			const doc = createMockText(
				`- [ ] Root task #workflow/development\n${lineText}`
			);
			const result = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);

			expect(result).toBeTruthy();
			expect(result?.workflowType).toBe("development");
			expect(result?.currentStage.id).toBe("development");
			expect(result?.currentSubStage?.id).toBe("coding");
		});

		test("should return null for unknown workflow", () => {
			const lineText = "- [ ] Task [stage::unknown]";
			const doc = createMockText(lineText);
			const result = resolveWorkflowInfo(lineText, doc, 1, mockPlugin);

			expect(result).toBeNull();
		});
	});

	describe("determineNextStage", () => {
		test("should determine next stage for linear stage", () => {
			const planningStage = sampleWorkflow.stages[0]; // planning
			const result = determineNextStage(planningStage, sampleWorkflow);

			expect(result.nextStageId).toBe("development");
			expect(result.nextSubStageId).toBeUndefined();
		});

		test("should determine next substage in cycle", () => {
			const developmentStage = sampleWorkflow.stages[1]; // development
			const codingSubStage = developmentStage.subStages![0]; // coding
			const result = determineNextStage(
				developmentStage,
				sampleWorkflow,
				codingSubStage
			);

			expect(result.nextStageId).toBe("development");
			expect(result.nextSubStageId).toBe("testing");
		});

		test("should move to next main stage from cycle", () => {
			const developmentStage = sampleWorkflow.stages[1]; // development
			const reviewSubStage = developmentStage.subStages![2]; // review (last in cycle)

			// Modify the substage to not have a next (simulating end of cycle)
			const modifiedReviewSubStage = {
				...reviewSubStage,
				next: undefined,
			};

			const result = determineNextStage(
				developmentStage,
				sampleWorkflow,
				modifiedReviewSubStage
			);

			expect(result.nextStageId).toBe("deployment");
			expect(result.nextSubStageId).toBeUndefined();
		});

		test("should stay in terminal stage", () => {
			const monitoringStage = sampleWorkflow.stages[3]; // monitoring (terminal)
			const result = determineNextStage(monitoringStage, sampleWorkflow);

			expect(result.nextStageId).toBe("monitoring");
			expect(result.nextSubStageId).toBeUndefined();
		});
	});

	describe("processTimestampAndCalculateTime", () => {
		test("should calculate spent time and remove timestamp", () => {
			const startTime = moment().subtract(2, "hours");
			const lineText = `  - [x] Completed task 🛫 ${startTime.format(
				"YYYY-MM-DD HH:mm:ss"
			)} [stage::planning]`;
			const doc = createMockText(
				`- [ ] Root task #workflow/development\n${lineText}`
			);

			const changes = processTimestampAndCalculateTime(
				lineText,
				doc,
				lineText.length + 1,
				2,
				"development",
				mockPlugin
			);

			expect(changes.length).toBeGreaterThan(0);

			// Should have a change to remove timestamp
			const removeChange = changes.find((c) => c.insert === "");
			expect(removeChange).toBeTruthy();

			// Should have a change to add spent time
			const timeChange = changes.find((c) => c.insert.includes("⏱️"));
			expect(timeChange).toBeTruthy();
		});

		test("should not process line without timestamp", () => {
			const lineText = "- [x] Completed task [stage::planning]";
			const doc = createMockText(lineText);

			const changes = processTimestampAndCalculateTime(
				lineText,
				doc,
				0,
				1,
				"development",
				mockPlugin
			);

			expect(changes).toHaveLength(0);
		});

		test("should calculate total time for final stage", () => {
			const mockPluginWithFullTime = createMockPlugin({
				workflow: {
					...mockPlugin.settings.workflow,
					calculateFullSpentTime: true,
				},
			});
			mockPluginWithFullTime.settings.workflow.definitions = [
				sampleWorkflow,
			];

			const startTime = moment().subtract(1, "hour");
			const lineText = `- [x] Final task 🛫 ${startTime.format(
				"YYYY-MM-DD HH:mm:ss"
			)} [stage::monitoring]`;
			const doc = createMockText(
				`- [ ] Root task #workflow/development\n${lineText}`
			);

			const changes = processTimestampAndCalculateTime(
				lineText,
				doc,
				lineText.length + 1,
				2,
				"development",
				mockPluginWithFullTime
			);

			// Should include total time calculation
			const totalTimeChange = changes.find((c) =>
				c.insert.includes("Total")
			);
			expect(totalTimeChange).toBeTruthy();
		});
	});

	describe("isLastWorkflowStageOrNotWorkflow", () => {
		test("should return true for terminal stage", () => {
			const lineText = "- [ ] Monitoring task [stage::monitoring]";
			const doc = createMockText(
				`- [ ] Root task #workflow/development\n${lineText}`
			);

			const result = isLastWorkflowStageOrNotWorkflow(
				lineText,
				2,
				doc,
				mockPlugin
			);

			expect(result).toBe(true);
		});

		test("should return false for non-terminal stage", () => {
			const lineText = "  - [ ] Planning task [stage::planning]";
			const doc = createMockText(
				`- [ ] Root task #workflow/development\n${lineText}`
			);

			const result = isLastWorkflowStageOrNotWorkflow(
				lineText,
				2,
				doc,
				mockPlugin
			);

			expect(result).toBe(false);
		});

		test("should return true for non-workflow task", () => {
			const lineText = "- [ ] Regular task";
			const doc = createMockText(lineText);

			const result = isLastWorkflowStageOrNotWorkflow(
				lineText,
				1,
				doc,
				mockPlugin
			);

			expect(result).toBe(true);
		});

		test("should return false for cycle substage with next", () => {
			const lineText = "  - [ ] Coding task [stage::development.coding]";
			const doc = createMockText(
				`- [ ] Root task #workflow/development\n${lineText}`
			);

			const result = isLastWorkflowStageOrNotWorkflow(
				lineText,
				2,
				doc,
				mockPlugin
			);

			expect(result).toBe(false);
		});
	});

	describe("generateWorkflowTaskText", () => {
		test("should generate task text for main stage", () => {
			const planningStage = sampleWorkflow.stages[0];
			const result = generateWorkflowTaskText(
				planningStage,
				"  ",
				mockPlugin,
				true
			);

			expect(result).toContain("- [ ] Planning");
			expect(result).toContain("[stage::planning]");
			expect(result).toContain("🛫"); // timestamp
		});

		test("should generate task text for substage", () => {
			const developmentStage = sampleWorkflow.stages[1];
			const codingSubStage = developmentStage.subStages![0];
			const result = generateWorkflowTaskText(
				developmentStage,
				"  ",
				mockPlugin,
				true,
				codingSubStage
			);

			expect(result).toContain("- [ ] Development (Coding)");
			expect(result).toContain("[stage::development.coding]");
		});

		test("should generate task text with subtasks for cycle stage", () => {
			const developmentStage = sampleWorkflow.stages[1];
			const result = generateWorkflowTaskText(
				developmentStage,
				"",
				mockPlugin,
				true
			);

			expect(result).toContain("- [ ] Development [stage::development]");
			expect(result).toContain(
				"- [ ] Development (Coding) [stage::development.coding]"
			);
		});

		test("should not add timestamp when disabled", () => {
			const mockPluginNoTimestamp = createMockPlugin({
				workflow: {
					...mockPlugin.settings.workflow,
					autoAddTimestamp: false,
				},
			});

			const planningStage = sampleWorkflow.stages[0];
			const result = generateWorkflowTaskText(
				planningStage,
				"",
				mockPluginNoTimestamp,
				true
			);

			expect(result).not.toContain("🛫");
		});
	});

	describe("determineTaskInsertionPoint", () => {
		test("should return line end when no child tasks", () => {
			const line = {
				number: 1,
				to: 50,
				text: "- [ ] Parent task",
			};
			const doc = createMockText("- [ ] Parent task");

			const result = determineTaskInsertionPoint(line, doc, "");

			expect(result).toBe(50);
		});

		test("should return after last child task", () => {
			const docText = `- [ ] Parent task
  - [ ] Child task 1
  - [ ] Child task 2
- [ ] Another parent`;

			const doc = createMockText(docText);
			const line = {
				number: 1,
				to: 17, // End of first line
				text: "- [ ] Parent task",
			};

			const result = determineTaskInsertionPoint(line, doc, "");

			// Should be after the last child task
			expect(result).toBeGreaterThan(17);
		});
	});

	describe("Workflow Integration Tests", () => {
		test("should handle complete workflow lifecycle", () => {
			// Start with root task
			let lineText = "- [ ] Feature development #workflow/development";
			let doc = createMockText(lineText);
			let resolvedInfo = resolveWorkflowInfo(
				lineText,
				doc,
				1,
				mockPlugin
			);

			expect(resolvedInfo?.isRootTask).toBe(true);
			expect(resolvedInfo?.currentStage.id).toBe("_root_task_");

			// Move to planning stage
			const { nextStageId } = determineNextStage(
				resolvedInfo!.currentStage,
				resolvedInfo!.workflow
			);
			expect(nextStageId).toBe("planning");

			// Generate planning task
			const planningStage = sampleWorkflow.stages.find(
				(s) => s.id === "planning"
			)!;
			const planningTaskText = generateWorkflowTaskText(
				planningStage,
				"  ",
				mockPlugin,
				true
			);
			expect(planningTaskText).toContain("Planning");

			// Move to development stage
			lineText = "  - [ ] Planning task [stage::planning]";
			doc = createMockText(
				`- [ ] Feature development #workflow/development\n${lineText}`
			);
			resolvedInfo = resolveWorkflowInfo(lineText, doc, 2, mockPlugin);

			const { nextStageId: devStageId } = determineNextStage(
				resolvedInfo!.currentStage,
				resolvedInfo!.workflow
			);
			expect(devStageId).toBe("development");

			// Test cycle substages
			const developmentStage = sampleWorkflow.stages.find(
				(s) => s.id === "development"
			)!;
			const firstSubStage = developmentStage.subStages![0];
			const { nextStageId: nextSubStageId, nextSubStageId: nextSubId } =
				determineNextStage(
					developmentStage,
					sampleWorkflow,
					firstSubStage
				);
			expect(nextSubStageId).toBe("development");
			expect(nextSubId).toBe("testing");
		});

		test("should handle workflow with missing definitions", () => {
			const lineText = "- [ ] Task [stage::nonexistent]";
			const doc = createMockText(lineText);
			const result = resolveWorkflowInfo(lineText, doc, 1, mockPlugin);

			expect(result).toBeNull();
		});

		test("should handle malformed stage markers", () => {
			const lineText = "- [ ] Task [stage::]";
			const result = extractWorkflowInfo(lineText);

			// extractWorkflowInfo should return null for malformed markers
			expect(result).toBeNull();
		});
	});

	describe("Time Calculation Edge Cases", () => {
		test("should handle invalid timestamp format", () => {
			const lineText =
				"- [x] Task 🛫 invalid-timestamp [stage::planning]";
			const doc = createMockText(lineText);

			const changes = processTimestampAndCalculateTime(
				lineText,
				doc,
				0,
				1,
				"development",
				mockPlugin
			);

			// Should not crash, may still process some changes
			expect(changes).toBeDefined();
		});

		test("should handle missing workflow definition during time calculation", () => {
			const mockPluginNoWorkflow = createMockPlugin({
				workflow: {
					...mockPlugin.settings.workflow,
					definitions: [],
				},
			});

			const startTime = moment().subtract(1, "hour");
			const lineText = `- [x] Task 🛫 ${startTime.format(
				"YYYY-MM-DD HH:mm:ss"
			)} [stage::planning]`;
			const doc = createMockText(lineText);

			const changes = processTimestampAndCalculateTime(
				lineText,
				doc,
				0,
				1,
				"nonexistent",
				mockPluginNoWorkflow
			);

			// Should still process timestamp removal and basic time calculation
			expect(changes.length).toBeGreaterThan(0);
		});
	});

	describe("Workflow Settings Integration", () => {
		test("should respect autoRemoveLastStageMarker setting", () => {
			const mockPluginNoRemove = createMockPlugin({
				workflow: {
					...mockPlugin.settings.workflow,
					autoRemoveLastStageMarker: false,
				},
			});

			const lineText = "- [x] Task [stage::monitoring]";
			const doc = createMockText(lineText);

			const result = isLastWorkflowStageOrNotWorkflow(
				lineText,
				1,
				doc,
				mockPluginNoRemove
			);

			expect(result).toBe(true); // Still terminal stage
		});

		test("should respect calculateSpentTime setting", () => {
			const mockPluginNoTime = createMockPlugin({
				workflow: {
					...mockPlugin.settings.workflow,
					calculateSpentTime: false,
				},
			});

			const startTime = moment().subtract(1, "hour");
			const lineText = `- [x] Task 🛫 ${startTime.format(
				"YYYY-MM-DD HH:mm:ss"
			)} [stage::planning]`;
			const doc = createMockText(lineText);

			const changes = processTimestampAndCalculateTime(
				lineText,
				doc,
				0,
				1,
				"development",
				mockPluginNoTime
			);

			// Should only have timestamp removal, no time calculation
			const timeChanges = changes.filter((c) => c.insert.includes("⏱️"));
			expect(timeChanges).toHaveLength(0);
		});
	});
});
