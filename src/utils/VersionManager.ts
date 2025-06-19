/**
 * Version Manager for handling plugin version detection and upgrade logic
 */

import { App, Component, Notice } from "obsidian";
import { LocalStorageCache } from "./persister";
import TaskProgressBarPlugin from "../index";

export interface VersionInfo {
	/** Current plugin version */
	current: string;
	/** Previously stored version */
	previous: string | null;
	/** Whether this is a first installation */
	isFirstInstall: boolean;
	/** Whether this is an upgrade */
	isUpgrade: boolean;
	/** Whether this is a downgrade */
	isDowngrade: boolean;
}

export interface VersionChangeResult {
	/** Version information */
	versionInfo: VersionInfo;
	/** Whether a rebuild is required */
	requiresRebuild: boolean;
	/** Reason for rebuild requirement */
	rebuildReason?: string;
}

/**
 * Manages plugin version detection and handles version-based operations
 */
export class VersionManager extends Component {
	private readonly VERSION_STORAGE_KEY = "plugin-version";
	private persister: LocalStorageCache;
	private currentVersion: string;

	constructor(
		private app: App,
		private plugin: TaskProgressBarPlugin
	) {
		super();
		this.persister = new LocalStorageCache(this.app.appId);
		this.currentVersion = this.getCurrentVersionFromManifest();
	}

	/**
	 * Get the current plugin version from the manifest
	 */
	private getCurrentVersionFromManifest(): string {
		// Try to get version from plugin manifest
		if (this.plugin.manifest?.version) {
			return this.plugin.manifest.version;
		}
		
		// Fallback to a default version if manifest is not available
		console.warn("Could not determine plugin version from manifest, using fallback");
		return "unknown";
	}

	/**
	 * Get the previously stored version from cache
	 */
	private async getPreviousVersion(): Promise<string | null> {
		try {
			const cached = await this.persister.loadFile<string>(this.VERSION_STORAGE_KEY);
			return cached?.data || null;
		} catch (error) {
			console.error("Error loading previous version:", error);
			return null;
		}
	}

	/**
	 * Store the current version to cache
	 */
	private async storeCurrentVersion(): Promise<void> {
		try {
			await this.persister.storeFile(this.VERSION_STORAGE_KEY, this.currentVersion);
		} catch (error) {
			console.error("Error storing current version:", error);
		}
	}

	/**
	 * Compare two version strings using semantic versioning
	 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
	 */
	private compareVersions(v1: string, v2: string): number {
		if (v1 === v2) return 0;
		if (v1 === "unknown" || v2 === "unknown") return 0; // Treat unknown versions as equal
		
		const v1Parts = v1.split('.').map(n => parseInt(n, 10) || 0);
		const v2Parts = v2.split('.').map(n => parseInt(n, 10) || 0);
		
		// Pad arrays to same length
		const maxLength = Math.max(v1Parts.length, v2Parts.length);
		while (v1Parts.length < maxLength) v1Parts.push(0);
		while (v2Parts.length < maxLength) v2Parts.push(0);
		
		for (let i = 0; i < maxLength; i++) {
			if (v1Parts[i] < v2Parts[i]) return -1;
			if (v1Parts[i] > v2Parts[i]) return 1;
		}
		
		return 0;
	}

	/**
	 * Check for version changes and determine if rebuild is required
	 */
	public async checkVersionChange(): Promise<VersionChangeResult> {
		const previousVersion = await this.getPreviousVersion();
		const isFirstInstall = previousVersion === null;
		
		let isUpgrade = false;
		let isDowngrade = false;
		let requiresRebuild = false;
		let rebuildReason: string | undefined;

		if (!isFirstInstall && previousVersion) {
			const comparison = this.compareVersions(this.currentVersion, previousVersion);
			isUpgrade = comparison > 0;
			isDowngrade = comparison < 0;
		}

		// Determine if rebuild is required
		if (isFirstInstall) {
			requiresRebuild = true;
			rebuildReason = "First installation - building initial index";
		} else if (isUpgrade) {
			requiresRebuild = true;
			rebuildReason = `Plugin upgraded from ${previousVersion} to ${this.currentVersion} - rebuilding index for compatibility`;
		} else if (isDowngrade) {
			requiresRebuild = true;
			rebuildReason = `Plugin downgraded from ${previousVersion} to ${this.currentVersion} - rebuilding index for compatibility`;
		}

		const versionInfo: VersionInfo = {
			current: this.currentVersion,
			previous: previousVersion,
			isFirstInstall,
			isUpgrade,
			isDowngrade
		};

		return {
			versionInfo,
			requiresRebuild,
			rebuildReason
		};
	}

	/**
	 * Mark the current version as processed (store it)
	 */
	public async markVersionProcessed(): Promise<void> {
		await this.storeCurrentVersion();
	}

	/**
	 * Get current version info
	 */
	public getCurrentVersion(): string {
		return this.currentVersion;
	}

	/**
	 * Force a version mismatch (useful for testing or manual rebuild)
	 */
	public async forceVersionMismatch(): Promise<void> {
		try {
			await this.persister.storeFile(this.VERSION_STORAGE_KEY, "0.0.0");
		} catch (error) {
			console.error("Error forcing version mismatch:", error);
		}
	}

	/**
	 * Clear version information (useful for testing)
	 */
	public async clearVersionInfo(): Promise<void> {
		try {
			await this.persister.removeFile(this.VERSION_STORAGE_KEY);
		} catch (error) {
			console.error("Error clearing version info:", error);
		}
	}
}
