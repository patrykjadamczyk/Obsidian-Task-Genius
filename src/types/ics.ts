/**
 * ICS (iCalendar) support types and interfaces
 */

import { Task } from "./task";

/** ICS event source configuration */
export interface IcsSource {
	/** Unique identifier for the ICS source */
	id: string;
	/** Display name for the source */
	name: string;
	/** URL to the ICS file */
	url: string;
	/** Whether this source is enabled */
	enabled: boolean;
	/** Color for events from this source */
	color?: string;
	/** Show type */
	showType: "badge" | "event";
	/** Refresh interval in minutes (default: 60) */
	refreshInterval: number;
	/** Last successful fetch timestamp */
	lastFetched?: number;
	/** Whether to show all-day events */
	showAllDayEvents: boolean;
	/** Whether to show timed events */
	showTimedEvents: boolean;
	/** Filter patterns to include/exclude events */
	filters?: IcsEventFilter;
	/** Authentication settings if needed */
	auth?: IcsAuthConfig;
}

/** ICS event filter configuration */
export interface IcsEventFilter {
	/** Include events matching these patterns */
	include?: {
		/** Summary/title patterns (regex supported) */
		summary?: string[];
		/** Description patterns (regex supported) */
		description?: string[];
		/** Location patterns (regex supported) */
		location?: string[];
		/** Categories to include */
		categories?: string[];
	};
	/** Exclude events matching these patterns */
	exclude?: {
		/** Summary/title patterns (regex supported) */
		summary?: string[];
		/** Description patterns (regex supported) */
		description?: string[];
		/** Location patterns (regex supported) */
		location?: string[];
		/** Categories to exclude */
		categories?: string[];
	};
}

/** Authentication configuration for ICS sources */
export interface IcsAuthConfig {
	/** Authentication type */
	type: "none" | "basic" | "bearer" | "custom";
	/** Username for basic auth */
	username?: string;
	/** Password for basic auth */
	password?: string;
	/** Bearer token */
	token?: string;
	/** Custom headers */
	headers?: Record<string, string>;
}

/** Raw ICS event data */
export interface IcsEvent {
	/** Unique identifier from ICS */
	uid: string;
	/** Event summary/title */
	summary: string;
	/** Event description */
	description?: string;
	/** Start date/time */
	dtstart: Date;
	/** End date/time */
	dtend?: Date;
	/** All-day event flag */
	allDay: boolean;
	/** Event location */
	location?: string;
	/** Event categories */
	categories?: string[];
	/** Event status (CONFIRMED, TENTATIVE, CANCELLED) */
	status?: string;
	/** Recurrence rule */
	rrule?: string;
	/** Exception dates */
	exdate?: Date[];
	/** Created timestamp */
	created?: Date;
	/** Last modified timestamp */
	lastModified?: Date;
	/** Event priority (0-9) */
	priority?: number;
	/** Event transparency (OPAQUE, TRANSPARENT) */
	transp?: string;
	/** Organizer information */
	organizer?: {
		name?: string;
		email?: string;
	};
	/** Attendees information */
	attendees?: Array<{
		name?: string;
		email?: string;
		role?: string;
		status?: string;
	}>;
	/** Custom properties */
	customProperties?: Record<string, string>;
	/** Source ICS configuration */
	source: IcsSource;
}

/** ICS event converted to Task format */
export interface IcsTask extends Task {
	/** Original ICS event data */
	icsEvent: IcsEvent;
	/** Whether this task is read-only (from ICS) */
	readonly: true;
	/** Source information */
	source: {
		type: "ics";
		name: string;
		id: string;
	};
}

/** ICS parsing result */
export interface IcsParseResult {
	/** Successfully parsed events */
	events: IcsEvent[];
	/** Parsing errors */
	errors: Array<{
		line?: number;
		message: string;
		context?: string;
	}>;
	/** Calendar metadata */
	metadata: {
		/** Calendar name */
		calendarName?: string;
		/** Calendar description */
		description?: string;
		/** Time zone */
		timezone?: string;
		/** Version */
		version?: string;
		/** Product identifier */
		prodid?: string;
	};
}

/** ICS fetch result */
export interface IcsFetchResult {
	/** Whether the fetch was successful */
	success: boolean;
	/** Parsed result if successful */
	data?: IcsParseResult;
	/** Error message if failed */
	error?: string;
	/** HTTP status code */
	statusCode?: number;
	/** Fetch timestamp */
	timestamp: number;
}

/** ICS cache entry */
export interface IcsCacheEntry {
	/** Source ID */
	sourceId: string;
	/** Cached events */
	events: IcsEvent[];
	/** Cache timestamp */
	timestamp: number;
	/** Cache expiry time */
	expiresAt: number;
	/** ETag for HTTP caching */
	etag?: string;
	/** Last-Modified header */
	lastModified?: string;
}

/** ICS manager configuration */
export interface IcsManagerConfig {
	/** List of ICS sources */
	sources: IcsSource[];
	/** Global refresh interval in minutes */
	globalRefreshInterval: number;
	/** Maximum cache age in hours */
	maxCacheAge: number;
	/** Whether to enable background refresh */
	enableBackgroundRefresh: boolean;
	/** Network timeout in seconds */
	networkTimeout: number;
	/** Maximum number of events per source */
	maxEventsPerSource: number;
	/** Whether to show ICS events in calendar views */
	showInCalendar: boolean;
	/** Whether to show ICS events in task lists */
	showInTaskLists: boolean;
	/** Default color for ICS events */
	defaultEventColor: string;
}

/** ICS synchronization status */
export interface IcsSyncStatus {
	/** Source ID */
	sourceId: string;
	/** Last sync timestamp */
	lastSync?: number;
	/** Next scheduled sync */
	nextSync?: number;
	/** Sync status */
	status: "idle" | "syncing" | "error" | "disabled";
	/** Error message if status is error */
	error?: string;
	/** Number of events synced */
	eventCount?: number;
}

/** ICS event occurrence for recurring events */
export interface IcsEventOccurrence extends Omit<IcsEvent, "rrule" | "exdate"> {
	/** Original event UID */
	originalUid: string;
	/** Occurrence start time */
	occurrenceStart: Date;
	/** Occurrence end time */
	occurrenceEnd?: Date;
	/** Whether this is an exception */
	isException: boolean;
}
