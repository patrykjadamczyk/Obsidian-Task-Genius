/**
 * Progress Manager for handling index rebuild progress notifications
 */

import { App, Component, Notice } from "obsidian";
import TaskProgressBarPlugin from "../index";

export interface RebuildProgress {
	/** Current step being processed */
	currentStep: string;
	/** Current file being processed */
	currentFile?: string;
	/** Number of files processed */
	processedFiles: number;
	/** Total number of files to process */
	totalFiles: number;
	/** Number of tasks found so far */
	tasksFound: number;
	/** Whether the rebuild is complete */
	isComplete: boolean;
	/** Any error that occurred */
	error?: string;
}

export interface RebuildProgressCallback {
	(progress: RebuildProgress): void;
}

/**
 * Manages progress notifications during index rebuild operations
 */
export class RebuildProgressManager extends Component {
	private currentProgress: RebuildProgress;
	private callbacks: Set<RebuildProgressCallback> = new Set();
	private currentNotice: Notice | null = null;
	private startTime: number = 0;

	constructor(
		private app: App,
		private plugin: TaskProgressBarPlugin
	) {
		super();
		this.currentProgress = this.createInitialProgress();
	}

	/**
	 * Create initial progress state
	 */
	private createInitialProgress(): RebuildProgress {
		return {
			currentStep: "Initializing",
			processedFiles: 0,
			totalFiles: 0,
			tasksFound: 0,
			isComplete: false
		};
	}

	/**
	 * Start a new rebuild progress session
	 */
	public startRebuild(totalFiles: number, reason?: string): void {
		this.startTime = Date.now();
		this.currentProgress = {
			currentStep: "Starting rebuild",
			processedFiles: 0,
			totalFiles,
			tasksFound: 0,
			isComplete: false
		};

		// Show initial notice
		const reasonText = reason ? ` (${reason})` : "";
		this.showNotice(`Task Genius: Rebuilding index${reasonText}...`, 0);
		
		this.notifyCallbacks();
	}

	/**
	 * Update progress for current step
	 */
	public updateProgress(updates: Partial<RebuildProgress>): void {
		this.currentProgress = {
			...this.currentProgress,
			...updates
		};

		// Update notice if it exists
		if (this.currentNotice && !this.currentProgress.isComplete) {
			const percentage = this.currentProgress.totalFiles > 0 
				? Math.round((this.currentProgress.processedFiles / this.currentProgress.totalFiles) * 100)
				: 0;
			
			const progressText = this.formatProgressText(percentage);
			this.updateNotice(progressText);
		}

		this.notifyCallbacks();
	}

	/**
	 * Update step information
	 */
	public updateStep(step: string, currentFile?: string): void {
		this.updateProgress({
			currentStep: step,
			currentFile
		});
	}

	/**
	 * Increment processed files count
	 */
	public incrementProcessedFiles(tasksFound: number = 0): void {
		this.updateProgress({
			processedFiles: this.currentProgress.processedFiles + 1,
			tasksFound: this.currentProgress.tasksFound + tasksFound
		});
	}

	/**
	 * Mark rebuild as complete
	 */
	public completeRebuild(tasksFound?: number): void {
		const duration = Date.now() - this.startTime;
		const finalTasksFound = tasksFound ?? this.currentProgress.tasksFound;
		
		this.currentProgress = {
			...this.currentProgress,
			currentStep: "Complete",
			isComplete: true,
			tasksFound: finalTasksFound
		};

		// Show completion notice
		this.showCompletionNotice(finalTasksFound, duration);
		
		this.notifyCallbacks();
	}

	/**
	 * Mark rebuild as failed
	 */
	public failRebuild(error: string): void {
		this.currentProgress = {
			...this.currentProgress,
			currentStep: "Failed",
			isComplete: true,
			error
		};

		// Show error notice
		this.showNotice(`Task Genius: Index rebuild failed - ${error}`, 5000);
		
		this.notifyCallbacks();
	}

	/**
	 * Add a progress callback
	 */
	public addCallback(callback: RebuildProgressCallback): void {
		this.callbacks.add(callback);
	}

	/**
	 * Remove a progress callback
	 */
	public removeCallback(callback: RebuildProgressCallback): void {
		this.callbacks.delete(callback);
	}

	/**
	 * Get current progress
	 */
	public getProgress(): RebuildProgress {
		return { ...this.currentProgress };
	}

	/**
	 * Notify all registered callbacks
	 */
	private notifyCallbacks(): void {
		for (const callback of this.callbacks) {
			try {
				callback(this.currentProgress);
			} catch (error) {
				console.error("Error in rebuild progress callback:", error);
			}
		}
	}

	/**
	 * Format progress text for display
	 */
	private formatProgressText(percentage: number): string {
		const { currentStep, processedFiles, totalFiles, tasksFound, currentFile } = this.currentProgress;
		
		let text = `Task Genius: ${currentStep}`;
		
		if (totalFiles > 0) {
			text += ` (${processedFiles}/${totalFiles} - ${percentage}%)`;
		}
		
		if (tasksFound > 0) {
			text += ` - ${tasksFound} tasks found`;
		}
		
		if (currentFile) {
			const fileName = currentFile.split('/').pop() || currentFile;
			text += ` - ${fileName}`;
		}
		
		return text;
	}

	/**
	 * Show or update a notice
	 */
	private showNotice(message: string, timeout: number = 0): void {
		// Hide existing notice
		if (this.currentNotice) {
			this.currentNotice.hide();
		}

		// Show new notice
		this.currentNotice = new Notice(message, timeout);
	}

	/**
	 * Update existing notice text
	 */
	private updateNotice(message: string): void {
		if (this.currentNotice && this.currentNotice.noticeEl) {
			this.currentNotice.setMessage(message);
		}
	}

	/**
	 * Show completion notice
	 */
	private showCompletionNotice(tasksFound: number, duration: number): void {
		const durationText = duration > 1000 
			? `${Math.round(duration / 1000)}s`
			: `${duration}ms`;
		
		const message = `Task Genius: Index rebuilt successfully! Found ${tasksFound} tasks in ${durationText}`;
		this.showNotice(message, 3000);
	}

	/**
	 * Clean up resources
	 */
	public onunload(): void {
		if (this.currentNotice) {
			this.currentNotice.hide();
			this.currentNotice = null;
		}
		this.callbacks.clear();
		super.onunload();
	}
}
