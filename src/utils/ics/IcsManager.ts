/**
 * ICS Manager
 * Manages ICS sources, fetching, caching, and synchronization
 */

import { Component, requestUrl, RequestUrlParam } from "obsidian";
import {
	IcsSource,
	IcsEvent,
	IcsFetchResult,
	IcsCacheEntry,
	IcsManagerConfig,
	IcsSyncStatus,
	IcsTask,
} from "../../types/ics";
import { Task } from "../../types/task";
import { IcsParser } from "./IcsParser";

export class IcsManager extends Component {
	private config: IcsManagerConfig;
	private cache: Map<string, IcsCacheEntry> = new Map();
	private syncStatuses: Map<string, IcsSyncStatus> = new Map();
	private refreshIntervals: Map<string, number> = new Map();
	private onEventsUpdated?: (sourceId: string, events: IcsEvent[]) => void;

	constructor(config: IcsManagerConfig) {
		super();
		this.config = config;
	}

	/**
	 * Initialize the ICS manager
	 */
	async initialize(): Promise<void> {
		// Initialize sync statuses for all sources
		for (const source of this.config.sources) {
			this.syncStatuses.set(source.id, {
				sourceId: source.id,
				status: source.enabled ? "idle" : "disabled",
			});
		}

		// Start background refresh if enabled
		if (this.config.enableBackgroundRefresh) {
			this.startBackgroundRefresh();
		}

		console.log("ICS Manager initialized");
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: IcsManagerConfig): void {
		this.config = config;

		// Update sync statuses for new/removed sources
		const currentSourceIds = new Set(this.config.sources.map((s) => s.id));

		// Remove statuses for deleted sources
		for (const [sourceId] of this.syncStatuses) {
			if (!currentSourceIds.has(sourceId)) {
				this.syncStatuses.delete(sourceId);
				this.clearRefreshInterval(sourceId);
			}
		}

		// Add statuses for new sources
		for (const source of this.config.sources) {
			if (!this.syncStatuses.has(source.id)) {
				this.syncStatuses.set(source.id, {
					sourceId: source.id,
					status: source.enabled ? "idle" : "disabled",
				});
			}
		}

		// Restart background refresh
		if (this.config.enableBackgroundRefresh) {
			this.startBackgroundRefresh();
		} else {
			this.stopBackgroundRefresh();
		}
	}

	/**
	 * Set event update callback
	 */
	setOnEventsUpdated(
		callback: (sourceId: string, events: IcsEvent[]) => void
	): void {
		this.onEventsUpdated = callback;
	}

	/**
	 * Get all events from all enabled sources
	 */
	getAllEvents(): IcsEvent[] {
		const allEvents: IcsEvent[] = [];

		for (const [sourceId, cacheEntry] of this.cache) {
			const source = this.config.sources.find((s) => s.id === sourceId);
			if (source?.enabled) {
				// Apply filters if configured
				const filteredEvents = this.applyFilters(
					cacheEntry.events,
					source
				);
				allEvents.push(...filteredEvents);
			}
		}

		return allEvents;
	}

	/**
	 * Get events from a specific source
	 */
	getEventsFromSource(sourceId: string): IcsEvent[] {
		const cacheEntry = this.cache.get(sourceId);
		const source = this.config.sources.find((s) => s.id === sourceId);

		if (!cacheEntry || !source?.enabled) {
			return [];
		}

		return this.applyFilters(cacheEntry.events, source);
	}

	/**
	 * Convert ICS events to Task format
	 */
	convertEventsToTasks(events: IcsEvent[]): IcsTask[] {
		return events.map((event) => this.convertEventToTask(event));
	}

	/**
	 * Convert single ICS event to Task format
	 */
	private convertEventToTask(event: IcsEvent): IcsTask {
		const task: IcsTask = {
			id: `ics-${event.source.id}-${event.uid}`,
			content: event.summary,
			filePath: `ics://${event.source.name}`,
			line: 0,
			completed: event.status === "COMPLETED",
			status: this.mapIcsStatusToTaskStatus(event.status),
			originalMarkdown: `- [${this.mapIcsStatusToTaskStatus(
				event.status
			)}] ${event.summary}`,
			metadata: {
				tags: event.categories || [],
				children: [],
				priority: this.mapIcsPriorityToTaskPriority(event.priority),
				startDate: event.dtstart.getTime(),
				dueDate: event.dtend?.getTime(),
				scheduledDate: event.dtstart.getTime(),
				project: event.source.name,
				context: event.location,
				heading: [],
			},
			icsEvent: event,
			readonly: true,
			source: {
				type: "ics",
				name: event.source.name,
				id: event.source.id,
			},
		};

		return task;
	}

	/**
	 * Map ICS status to task status
	 */
	private mapIcsStatusToTaskStatus(icsStatus?: string): string {
		switch (icsStatus?.toUpperCase()) {
			case "COMPLETED":
				return "x";
			case "CANCELLED":
				return "-";
			case "TENTATIVE":
				return "?";
			case "CONFIRMED":
			default:
				return " ";
		}
	}

	/**
	 * Map ICS priority to task priority
	 */
	private mapIcsPriorityToTaskPriority(
		icsPriority?: number
	): number | undefined {
		if (icsPriority === undefined) return undefined;

		// ICS priority: 0 (undefined), 1-4 (high), 5 (normal), 6-9 (low)
		// Task priority: 1 (highest), 2 (high), 3 (medium), 4 (low), 5 (lowest)
		if (icsPriority >= 1 && icsPriority <= 4) return 1; // High
		if (icsPriority === 5) return 3; // Medium
		if (icsPriority >= 6 && icsPriority <= 9) return 5; // Low
		return undefined;
	}

	/**
	 * Manually sync a specific source
	 */
	async syncSource(sourceId: string): Promise<IcsFetchResult> {
		const source = this.config.sources.find((s) => s.id === sourceId);
		if (!source) {
			throw new Error(`Source not found: ${sourceId}`);
		}

		this.updateSyncStatus(sourceId, { status: "syncing" });

		try {
			const result = await this.fetchIcsData(source);

			if (result.success && result.data) {
				// Update cache
				const cacheEntry: IcsCacheEntry = {
					sourceId,
					events: result.data.events,
					timestamp: result.timestamp,
					expiresAt:
						result.timestamp +
						this.config.maxCacheAge * 60 * 60 * 1000,
				};
				this.cache.set(sourceId, cacheEntry);

				// Update sync status
				this.updateSyncStatus(sourceId, {
					status: "idle",
					lastSync: result.timestamp,
					eventCount: result.data.events.length,
				});

				// Notify listeners
				this.onEventsUpdated?.(sourceId, result.data.events);
			} else {
				this.updateSyncStatus(sourceId, {
					status: "error",
					error: result.error || "Unknown error",
				});
			}

			return result;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.updateSyncStatus(sourceId, {
				status: "error",
				error: errorMessage,
			});

			return {
				success: false,
				error: errorMessage,
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Sync all enabled sources
	 */
	async syncAllSources(): Promise<Map<string, IcsFetchResult>> {
		const results = new Map<string, IcsFetchResult>();

		const syncPromises = this.config.sources
			.filter((source) => source.enabled)
			.map(async (source) => {
				const result = await this.syncSource(source.id);
				results.set(source.id, result);
				return result;
			});

		await Promise.allSettled(syncPromises);
		return results;
	}

	/**
	 * Get sync status for a source
	 */
	getSyncStatus(sourceId: string): IcsSyncStatus | undefined {
		return this.syncStatuses.get(sourceId);
	}

	/**
	 * Get sync statuses for all sources
	 */
	getAllSyncStatuses(): Map<string, IcsSyncStatus> {
		return new Map(this.syncStatuses);
	}

	/**
	 * Clear cache for a specific source
	 */
	clearSourceCache(sourceId: string): void {
		this.cache.delete(sourceId);
	}

	/**
	 * Clear all cache
	 */
	clearAllCache(): void {
		this.cache.clear();
	}

	/**
	 * Fetch ICS data from a source
	 */
	private async fetchIcsData(source: IcsSource): Promise<IcsFetchResult> {
		try {
			const requestParams: RequestUrlParam = {
				url: source.url,
				method: "GET",
				headers: {
					"User-Agent": "Obsidian Task Progress Bar Plugin",
					...source.auth?.headers,
				},
			};

			// Add authentication if configured
			if (source.auth) {
				switch (source.auth.type) {
					case "basic":
						if (source.auth.username && source.auth.password) {
							const credentials = btoa(
								`${source.auth.username}:${source.auth.password}`
							);
							requestParams.headers![
								"Authorization"
							] = `Basic ${credentials}`;
						}
						break;
					case "bearer":
						if (source.auth.token) {
							requestParams.headers![
								"Authorization"
							] = `Bearer ${source.auth.token}`;
						}
						break;
				}
			}

			// Check cache headers
			const cacheEntry = this.cache.get(source.id);
			if (cacheEntry?.etag) {
				requestParams.headers!["If-None-Match"] = cacheEntry.etag;
			}
			if (cacheEntry?.lastModified) {
				requestParams.headers!["If-Modified-Since"] =
					cacheEntry.lastModified;
			}

			const response = await requestUrl(requestParams);

			// Handle 304 Not Modified
			if (response.status === 304 && cacheEntry) {
				return {
					success: true,
					data: {
						events: cacheEntry.events,
						errors: [],
						metadata: {},
					},
					timestamp: Date.now(),
				};
			}

			if (response.status !== 200) {
				return {
					success: false,
					error: `HTTP ${response.status}: ${
						response.text || "Unknown error"
					}`,
					statusCode: response.status,
					timestamp: Date.now(),
				};
			}

			// Parse ICS content
			const parseResult = IcsParser.parse(response.text, source);

			// Update cache with HTTP headers
			if (cacheEntry) {
				cacheEntry.etag = response.headers["etag"];
				cacheEntry.lastModified = response.headers["last-modified"];
			}

			return {
				success: true,
				data: parseResult,
				timestamp: Date.now(),
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Apply filters to events
	 */
	private applyFilters(events: IcsEvent[], source: IcsSource): IcsEvent[] {
		let filteredEvents = [...events];

		// Apply event type filters
		if (!source.showAllDayEvents) {
			filteredEvents = filteredEvents.filter((event) => !event.allDay);
		}
		if (!source.showTimedEvents) {
			filteredEvents = filteredEvents.filter((event) => event.allDay);
		}

		// Apply custom filters
		if (source.filters) {
			filteredEvents = filteredEvents.filter((event) => {
				// Include filters
				if (source.filters!.include) {
					const include = source.filters!.include;
					let shouldInclude = true;

					if (include.summary?.length) {
						shouldInclude =
							shouldInclude &&
							include.summary.some((pattern) =>
								this.matchesPattern(event.summary, pattern)
							);
					}
					if (include.description?.length && event.description) {
						shouldInclude =
							shouldInclude &&
							include.description.some((pattern) =>
								this.matchesPattern(event.description!, pattern)
							);
					}
					if (include.location?.length && event.location) {
						shouldInclude =
							shouldInclude &&
							include.location.some((pattern) =>
								this.matchesPattern(event.location!, pattern)
							);
					}
					if (include.categories?.length && event.categories) {
						shouldInclude =
							shouldInclude &&
							include.categories.some((category) =>
								event.categories!.includes(category)
							);
					}

					if (!shouldInclude) return false;
				}

				// Exclude filters
				if (source.filters!.exclude) {
					const exclude = source.filters!.exclude;

					if (exclude.summary?.length) {
						if (
							exclude.summary.some((pattern) =>
								this.matchesPattern(event.summary, pattern)
							)
						) {
							return false;
						}
					}
					if (exclude.description?.length && event.description) {
						if (
							exclude.description.some((pattern) =>
								this.matchesPattern(event.description!, pattern)
							)
						) {
							return false;
						}
					}
					if (exclude.location?.length && event.location) {
						if (
							exclude.location.some((pattern) =>
								this.matchesPattern(event.location!, pattern)
							)
						) {
							return false;
						}
					}
					if (exclude.categories?.length && event.categories) {
						if (
							exclude.categories.some((category) =>
								event.categories!.includes(category)
							)
						) {
							return false;
						}
					}
				}

				return true;
			});
		}

		// Limit number of events
		if (filteredEvents.length > this.config.maxEventsPerSource) {
			filteredEvents = filteredEvents
				.sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime())
				.slice(0, this.config.maxEventsPerSource);
		}

		return filteredEvents;
	}

	/**
	 * Check if text matches a pattern (supports regex)
	 */
	private matchesPattern(text: string, pattern: string): boolean {
		try {
			// Try to use as regex first
			const regex = new RegExp(pattern, "i");
			return regex.test(text);
		} catch {
			// Fall back to simple string matching
			return text.toLowerCase().includes(pattern.toLowerCase());
		}
	}

	/**
	 * Update sync status
	 */
	private updateSyncStatus(
		sourceId: string,
		updates: Partial<IcsSyncStatus>
	): void {
		const current = this.syncStatuses.get(sourceId) || {
			sourceId,
			status: "idle",
		};
		this.syncStatuses.set(sourceId, { ...current, ...updates });
	}

	/**
	 * Start background refresh for all sources
	 */
	private startBackgroundRefresh(): void {
		this.stopBackgroundRefresh(); // Clear existing intervals

		for (const source of this.config.sources) {
			if (source.enabled) {
				const interval =
					source.refreshInterval || this.config.globalRefreshInterval;
				const intervalId = setInterval(() => {
					this.syncSource(source.id).catch((error) => {
						console.error(
							`Background sync failed for source ${source.id}:`,
							error
						);
					});
				}, interval * 60 * 1000); // Convert minutes to milliseconds

				this.refreshIntervals.set(source.id, intervalId as any);
			}
		}
	}

	/**
	 * Stop background refresh
	 */
	private stopBackgroundRefresh(): void {
		for (const [sourceId, intervalId] of this.refreshIntervals) {
			clearInterval(intervalId);
		}
		this.refreshIntervals.clear();
	}

	/**
	 * Clear refresh interval for a specific source
	 */
	private clearRefreshInterval(sourceId: string): void {
		const intervalId = this.refreshIntervals.get(sourceId);
		if (intervalId) {
			clearInterval(intervalId);
			this.refreshIntervals.delete(sourceId);
		}
	}

	/**
	 * Cleanup when component is unloaded
	 */
	override onunload(): void {
		this.stopBackgroundRefresh();
		super.onunload();
	}
}
