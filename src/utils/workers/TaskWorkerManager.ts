/**
 * Manager for task indexing web workers
 */

import { TFile, Vault } from "obsidian";
import { Task } from "../types/TaskIndex";
import {
	BatchIndexCommand,
	BatchIndexResult,
	ErrorResult,
	IndexerCommand,
	IndexerResult,
	ParseTasksCommand,
	TaskParseResult,
} from "./TaskIndexWorker";

// Import worker
import TaskWorker from "./TaskIndexWorker";

/**
 * Options for worker pool
 */
export interface WorkerPoolOptions {
	/** Maximum number of workers to use */
	maxWorkers: number;
	/** Target CPU utilization (0.1 to 1.0) */
	cpuUtilization: number;
	/** Whether to enable debug logging */
	debug?: boolean;
}

/**
 * Default worker pool options
 */
export const DEFAULT_WORKER_OPTIONS: WorkerPoolOptions = {
	maxWorkers: Math.max(1, (navigator.hardwareConcurrency || 2) - 1),
	cpuUtilization: 0.75,
	debug: false,
};

/**
 * Task callback type
 */
export type TaskCallback<T> = (error: Error | null, result?: T) => void;

/**
 * Task request interface
 */
interface TaskRequest {
	/** Command to process */
	command: IndexerCommand;
	/** Callback to call with result */
	callback: TaskCallback<IndexerResult>;
}

/**
 * Worker data for pool
 */
interface WorkerData {
	/** Worker instance */
	worker: Worker;
	/** Whether the worker is busy */
	busy: boolean;
	/** Last time this worker finished a task */
	lastTaskFinished: number;
	/** Number of tasks processed */
	tasksProcessed: number;
	/** Total processing time */
	totalProcessingTime: number;
}

/**
 * Worker pool for task processing
 */
export class TaskWorkerManager {
	/** Worker pool */
	private workers: WorkerData[] = [];
	/** Queue of pending tasks */
	private taskQueue: TaskRequest[] = [];
	/** Whether the pool is currently active */
	private active: boolean = true;
	/** Options for the worker pool */
	private options: WorkerPoolOptions;
	/** Vault instance */
	private vault: Vault;

	/**
	 * Create a new worker pool
	 */
	constructor(vault: Vault, options: Partial<WorkerPoolOptions> = {}) {
		this.options = { ...DEFAULT_WORKER_OPTIONS, ...options };
		this.vault = vault;

		// Initialize workers up to max
		this.initializeWorkers();
	}

	/**
	 * Initialize workers in the pool
	 */
	private initializeWorkers(): void {
		const workerCount = Math.min(
			this.options.maxWorkers,
			navigator.hardwareConcurrency || 2
		);

		for (let i = 0; i < workerCount; i++) {
			try {
				const worker = new Worker(
					URL.createObjectURL(
						new Blob([`importScripts('${TaskWorker}')`], {
							type: "application/javascript",
						})
					)
				);

				// Setup worker message handler
				worker.onmessage = (event) => {
					this.handleWorkerMessage(worker, event.data);
				};

				worker.onerror = (event) => {
					console.error("Worker error:", event);
				};

				this.workers.push({
					worker,
					busy: false,
					lastTaskFinished: Date.now(),
					tasksProcessed: 0,
					totalProcessingTime: 0,
				});

				this.log(`Initialized worker #${i + 1}`);
			} catch (error) {
				console.error("Failed to initialize worker:", error);
			}
		}

		this.log(
			`Initialized ${this.workers.length} workers (requested ${workerCount})`
		);

		// Check if we have any workers
		if (this.workers.length === 0) {
			console.warn(
				"No workers could be initialized, falling back to main thread processing"
			);
		}
	}

	/**
	 * Process a single file for tasks
	 */
	public processFile(file: TFile, callback: TaskCallback<Task[]>): void {
		this.vault
			.cachedRead(file)
			.then((content) => {
				// Create file stats (adapting to the worker's needs)
				const stats = {
					ctime: file.stat.ctime,
					mtime: file.stat.mtime,
					size: file.stat.size,
				};

				const command: ParseTasksCommand = {
					type: "parseTasks",
					filePath: file.path,
					content,
					stats,
				};

				this.queueTask(command, (error, result) => {
					if (error) {
						callback(error);
						return;
					}

					if (!result || result.type === "error") {
						callback(
							new Error(
								(result as ErrorResult)?.error ||
									"Unknown error"
							)
						);
						return;
					}

					if (result.type === "parseResult") {
						const parseResult = result as TaskParseResult;
						callback(null, parseResult.tasks);
					} else {
						callback(
							new Error(`Unexpected result type: ${result.type}`)
						);
					}
				});
			})
			.catch((error) => {
				callback(error);
			});
	}

	/**
	 * Process multiple files in a batch
	 */
	public processBatch(
		files: TFile[],
		callback: TaskCallback<Map<string, Task[]>>
	): void {
		// Read all files first
		Promise.all(
			files.map((file) =>
				this.vault.cachedRead(file).then((content) => ({
					file,
					content,
				}))
			)
		)
			.then((fileContents) => {
				const command: BatchIndexCommand = {
					type: "batchIndex",
					files: fileContents.map(({ file, content }) => ({
						path: file.path,
						content,
						stats: {
							ctime: file.stat.ctime,
							mtime: file.stat.mtime,
							size: file.stat.size,
						},
					})),
				};

				this.queueTask(command, (error, result) => {
					if (error) {
						callback(error);
						return;
					}

					if (!result || result.type === "error") {
						callback(
							new Error(
								(result as ErrorResult)?.error ||
									"Unknown error"
							)
						);
						return;
					}

					if (result.type === "batchResult") {
						const batchResult = result as BatchIndexResult;
						// This is just a summary, not the actual tasks
						callback(
							new Error("Batch result does not include tasks")
						);
					} else if (result.type === "parseResult") {
						// Single file result, convert to map
						const parseResult = result as TaskParseResult;
						const resultMap = new Map<string, Task[]>();
						resultMap.set(parseResult.filePath, parseResult.tasks);
						callback(null, resultMap);
					} else {
						callback(
							new Error(`Unexpected result type: ${result.type}`)
						);
					}
				});
			})
			.catch((error) => {
				callback(error);
			});
	}

	/**
	 * Queue a task for processing by a worker
	 */
	private queueTask(
		command: IndexerCommand,
		callback: TaskCallback<IndexerResult>
	): void {
		this.taskQueue.push({
			command,
			callback,
		});

		this.processQueue();
	}

	/**
	 * Process the task queue
	 */
	private processQueue(): void {
		if (!this.active || this.taskQueue.length === 0) {
			return;
		}

		// Try to find an available worker
		const availableWorker = this.getAvailableWorker();
		if (!availableWorker) {
			// No available workers, will retry when a worker becomes available
			return;
		}

		// Get the next task
		const task = this.taskQueue.shift();
		if (!task) {
			return;
		}

		// Mark the worker as busy
		availableWorker.busy = true;

		try {
			// Send the task to the worker
			availableWorker.worker.postMessage(task.command);

			// Store the callback with the worker so we can call it when the worker responds
			(availableWorker as any).currentTask = task;
			(availableWorker as any).taskStartTime = Date.now();

			this.log(`Sent task to worker: ${task.command.type}`);
		} catch (error) {
			// Failed to send task to worker
			console.error("Failed to send task to worker:", error);

			// Mark the worker as available again
			availableWorker.busy = false;

			// Call the callback with the error
			task.callback(error as Error);

			// Try to process the next task
			this.processQueue();
		}
	}

	/**
	 * Handle a message from a worker
	 */
	private handleWorkerMessage(worker: Worker, data: IndexerResult): void {
		// Find the worker data
		const workerData = this.workers.find((w) => w.worker === worker);
		if (!workerData) {
			console.error("Received message from unknown worker:", data);
			return;
		}

		// Get the task that was being processed
		const task = (workerData as any).currentTask as TaskRequest | undefined;
		const taskStartTime = (workerData as any).taskStartTime as
			| number
			| undefined;

		// Update worker stats
		workerData.busy = false;
		workerData.lastTaskFinished = Date.now();
		workerData.tasksProcessed++;

		if (taskStartTime) {
			const processingTime = Date.now() - taskStartTime;
			workerData.totalProcessingTime += processingTime;

			// Apply throttling based on CPU utilization
			const delay = Math.round(
				(processingTime * (1 - this.options.cpuUtilization)) /
					this.options.cpuUtilization
			);
			if (delay > 0) {
				// Delay before this worker processes another task
				setTimeout(() => {
					// Process next task if there are any
					this.processQueue();
				}, delay);

				this.log(
					`Worker throttled for ${delay}ms (processed in ${processingTime}ms)`
				);
				return;
			}
		}

		// Clear the current task
		(workerData as any).currentTask = undefined;
		(workerData as any).taskStartTime = undefined;

		// Call the callback with the result
		if (task) {
			if (data.type === "error") {
				task.callback(new Error((data as ErrorResult).error));
			} else {
				task.callback(null, data);
			}
		} else {
			console.error(
				"Received message from worker with no associated task:",
				data
			);
		}

		// Process next task if there are any
		this.processQueue();
	}

	/**
	 * Get an available worker
	 */
	private getAvailableWorker(): WorkerData | undefined {
		// First, look for a non-busy worker
		for (const worker of this.workers) {
			if (!worker.busy) {
				return worker;
			}
		}

		return undefined;
	}

	/**
	 * Shutdown the worker pool
	 */
	public shutdown(): void {
		this.active = false;

		// Terminate all workers
		for (const worker of this.workers) {
			worker.worker.terminate();
		}

		// Clear the workers array
		this.workers = [];

		// Clear the task queue and call all callbacks with an error
		for (const task of this.taskQueue) {
			task.callback(new Error("Worker pool shut down"));
		}

		this.taskQueue = [];

		this.log("Worker pool shut down");
	}

	/**
	 * Get the number of pending tasks
	 */
	public getPendingTaskCount(): number {
		return this.taskQueue.length;
	}

	/**
	 * Log a message if debugging is enabled
	 */
	private log(message: string): void {
		if (this.options.debug) {
			console.log(`[TaskWorkerManager] ${message}`);
		}
	}
}
