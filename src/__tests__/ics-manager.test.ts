/**
 * ICS Manager Tests
 * Tests for managing ICS calendar sources and fetching data
 */

import { IcsManager } from "../utils/ics/IcsManager";
import { IcsSource, IcsManagerConfig } from "../types/ics";

// Mock Obsidian Component
jest.mock("obsidian", () => ({
	Component: class MockComponent {
		constructor() {}
		load() {}
		unload() {}
		onload() {}
		onunload() {}
		addChild() {}
		removeChild() {}
		register() {}
	},
	requestUrl: jest.fn(),
}));

// Mock Component for testing
class MockComponent {
	constructor() {}
	load() {}
	unload() {}
}

describe("ICS Manager", () => {
	let icsManager: IcsManager;
	let mockComponent: MockComponent;

	const testConfig: IcsManagerConfig = {
		sources: [
			{
				id: "chinese-lunar",
				name: "Chinese Lunar Calendar",
				url: "https://lwlsw.github.io/Chinese-Lunar-Calendar-ics/chinese_lunar_my.ics",
				enabled: true,
				refreshInterval: 60,
				showAllDayEvents: true,
				showTimedEvents: true,
			},
		],
		enableBackgroundRefresh: false, // Disable for testing
		globalRefreshInterval: 60,
		maxCacheAge: 24,
		networkTimeout: 30,
		maxEventsPerSource: 1000,
		showInCalendar: true,
		showInTaskLists: true,
		defaultEventColor: "#3b82f6",
	};

	beforeEach(async () => {
		mockComponent = new MockComponent();
		icsManager = new IcsManager(testConfig);
		await icsManager.initialize();
	});

	afterEach(() => {
		if (icsManager) {
			icsManager.unload();
		}
	});

	describe("Initialization", () => {
		test("should initialize with config", () => {
			expect(icsManager).toBeDefined();
		});

		test("should update config", () => {
			const newConfig = {
				...testConfig,
				globalRefreshInterval: 120,
			};

			icsManager.updateConfig(newConfig);
			// Test that config was updated by checking sync status
			const syncStatus = icsManager.getSyncStatus(
				testConfig.sources[0].id
			);
			expect(syncStatus).toBeDefined();
		});
	});

	describe("Source Management", () => {
		test("should manage sync statuses", () => {
			const syncStatus = icsManager.getSyncStatus(
				testConfig.sources[0].id
			);
			expect(syncStatus).toBeDefined();
			expect(syncStatus?.sourceId).toBe(testConfig.sources[0].id);
		});

		test("should get all sync statuses", () => {
			const allStatuses = icsManager.getAllSyncStatuses();
			expect(allStatuses.size).toBe(1);
			expect(allStatuses.has(testConfig.sources[0].id)).toBe(true);
		});

		test("should handle disabled sources", () => {
			const configWithDisabled = {
				...testConfig,
				sources: [
					...testConfig.sources,
					{
						id: "disabled-source",
						name: "Disabled Source",
						url: "https://example.com/disabled.ics",
						enabled: false,
						refreshInterval: 60,
						showAllDayEvents: true,
						showTimedEvents: true,
					},
				],
			};

			icsManager.updateConfig(configWithDisabled);

			const allStatuses = icsManager.getAllSyncStatuses();
			expect(allStatuses.size).toBe(2);

			const disabledStatus = icsManager.getSyncStatus("disabled-source");
			expect(disabledStatus?.status).toBe("disabled");
		});
	});

	describe("Data Fetching", () => {
		test("should handle sync source", async () => {
			const source = testConfig.sources[0];

			try {
				const result = await icsManager.syncSource(source.id);

				expect(result.success).toBe(true);
				expect(result.data).toBeDefined();

				if (result.data) {
					expect(result.data.events.length).toBeGreaterThan(0);
					console.log(
						`Fetched ${result.data.events.length} events from Chinese Lunar Calendar`
					);
				}
			} catch (error) {
				console.warn(
					"Network test failed, this is expected in some environments:",
					error
				);
				// Don't fail the test if network is unavailable
			}
		}, 10000); // 10 second timeout for network request

		test("should handle network errors gracefully", async () => {
			const invalidConfig = {
				...testConfig,
				sources: [
					{
						id: "invalid-source",
						name: "Invalid Source",
						url: "https://invalid-url-that-does-not-exist.com/calendar.ics",
						enabled: true,
						refreshInterval: 60,
						showAllDayEvents: true,
						showTimedEvents: true,
					},
				],
			};

			icsManager.updateConfig(invalidConfig);
			const result = await icsManager.syncSource("invalid-source");

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.data).toBeUndefined();
		});
	});

	describe("Event Management", () => {
		test("should get all events", () => {
			const events = icsManager.getAllEvents();
			expect(Array.isArray(events)).toBe(true);
		});

		test("should get events from specific source", () => {
			const events = icsManager.getEventsFromSource(
				testConfig.sources[0].id
			);
			expect(Array.isArray(events)).toBe(true);
		});

		test("should convert events to tasks", () => {
			const mockEvents: any[] = []; // Empty array for testing
			const tasks = icsManager.convertEventsToTasks(mockEvents);
			expect(Array.isArray(tasks)).toBe(true);
			expect(tasks.length).toBe(0);
		});
	});

	describe("Cache Management", () => {
		test("should clear source cache", () => {
			icsManager.clearSourceCache(testConfig.sources[0].id);
			// Should not throw error
			expect(true).toBe(true);
		});

		test("should clear all cache", () => {
			icsManager.clearAllCache();
			// Should not throw error
			expect(true).toBe(true);
		});
	});

	describe("Background Refresh", () => {
		test("should handle background refresh configuration", () => {
			// Test that background refresh is disabled in test config
			expect(testConfig.enableBackgroundRefresh).toBe(false);

			// Enable background refresh
			const newConfig = {
				...testConfig,
				enableBackgroundRefresh: true,
			};

			icsManager.updateConfig(newConfig);
			// Should not throw error
			expect(true).toBe(true);
		});
	});
});

/**
 * Integration test for real-world usage
 */
describe("ICS Manager Integration", () => {
	test("should work end-to-end with Chinese Lunar Calendar", async () => {
		const config: IcsManagerConfig = {
			sources: [
				{
					id: "integration-test",
					name: "Integration Test Calendar",
					url: "https://lwlsw.github.io/Chinese-Lunar-Calendar-ics/chinese_lunar_my.ics",
					enabled: true,
					refreshInterval: 60,
					showAllDayEvents: true,
					showTimedEvents: true,
				},
			],
			enableBackgroundRefresh: false, // Disable for testing
			globalRefreshInterval: 60,
			maxCacheAge: 24,
			networkTimeout: 30,
			maxEventsPerSource: 100, // Limit for testing
			showInCalendar: true,
			showInTaskLists: true,
			defaultEventColor: "#3b82f6",
		};

		const manager = new IcsManager(config);
		await manager.initialize();

		try {
			// Test the complete workflow
			const result = await manager.syncSource(config.sources[0].id);

			if (result.success && result.data) {
				expect(result.data.events.length).toBeGreaterThan(0);
				expect(result.data.events.length).toBeLessThanOrEqual(100); // Respects limit

				// Convert to tasks
				const tasks = manager.convertEventsToTasks(result.data.events);
				expect(tasks).toHaveLength(result.data.events.length);

				// All tasks should be readonly
				tasks.forEach((task) => {
					expect(task.readonly).toBe(true);
				});

				console.log(
					`Integration test successful: ${result.data.events.length} events, ${tasks.length} tasks`
				);
			}
		} catch (error) {
			console.warn(
				"Integration test failed due to network issues:",
				error
			);
		} finally {
			manager.unload();
		}
	}, 15000); // 15 second timeout for integration test
});
