/**
 * Manager for task indexing web workers
 */

import { Component, ListItemCache, MetadataCache, TFile, Vault } from "obsidian";
import { Task } from "../types/TaskIndex";
import {
	BatchIndexCommand,
	BatchIndexResult,
	ErrorResult,
	IndexerCommand,
	IndexerResult,
	ParseTasksCommand,
	TaskParseResult,
} from "./TaskIndexWorkerMessage";

// Import worker and utilities
import TaskWorker from "TaskIndexWorker";
import { Deferred, deferred } from "./deferred";

// Using similar queue structure as importer.ts
import { Queue } from "@datastructures-js/queue";

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
 * A worker in the pool of executing workers
 */
interface PoolWorker {
	/** The id of this worker */
	id: number;
	/** The raw underlying worker */
	worker: Worker;
	/** UNIX time indicating the next time this worker is available for execution */
	availableAt: number;
	/** The active task this worker is processing, if any */
	active?: [TFile, Deferred<any>, number];
}

/**
 * Task metadata from Obsidian cache
 */
interface TaskMetadata {
	/** List item cache information */
	listItems?: ListItemCache[];
	/** Raw file content */
	content: string;
	/** File stats */
	stats: {
		ctime: number;
		mtime: number;
		size: number;
	};
}

/**
 * Worker pool for task processing
 */
export class TaskWorkerManager extends Component {
	/** Worker pool */
	private workers: Map<number, PoolWorker> = new Map();
	/** Task queue */
	private queue: Queue<[TFile, Deferred<any>]> = new Queue();
	/** Map of outstanding tasks by file path */
	private outstanding: Map<string, Promise<any>> = new Map();
	/** Whether the pool is currently active */
	private active: boolean = true;
	/** Worker pool options */
	private options: WorkerPoolOptions;
	/** Vault instance */
	private vault: Vault;
	/** Metadata cache for accessing file metadata */
	private metadataCache: MetadataCache;
	/** Next worker ID to assign */
	private nextWorkerId: number = 0;

	/**
	 * Create a new worker pool
	 */
	constructor(vault: Vault, metadataCache: MetadataCache, options: Partial<WorkerPoolOptions> = {}) {
		super();
		this.options = { ...DEFAULT_WORKER_OPTIONS, ...options };
		this.vault = vault;
		this.metadataCache = metadataCache;

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
				const worker = this.newWorker();
				this.workers.set(worker.id, worker);
				this.log(`Initialized worker #${worker.id}`);
			} catch (error) {
				console.error("Failed to initialize worker:", error);
			}
		}

		this.log(
			`Initialized ${this.workers.size} workers (requested ${workerCount})`
		);

		// Check if we have any workers
		if (this.workers.size === 0) {
			console.warn(
				"No workers could be initialized, falling back to main thread processing"
			);
		}
	}

	/**
	 * Create a new worker
	 */
	private newWorker(): PoolWorker {
		const workerId = this.nextWorkerId++;
		
		let worker = new Worker(
			URL.createObjectURL(
				new Blob([`importScripts('${TaskWorker}')`], {
					type: "application/javascript",
				})
			)
		);

		const poolWorker: PoolWorker = {
			id: workerId,
			worker,
			availableAt: Date.now(),
		};

		worker.onmessage = (evt) => this.finish(poolWorker, evt.data);
		worker.onerror = (event) => {
			console.error("Worker error:", event);
			
			// If there's an active task, reject it
			if (poolWorker.active) {
				poolWorker.active[1].reject("Worker error");
				poolWorker.active = undefined;
			}
		};

		return poolWorker;
	}

	/**
	 * Process a single file for tasks
	 */
	public processFile(file: TFile): Promise<Task[]> {
		// De-bounce repeated requests for the same file
		let existing = this.outstanding.get(file.path);
		if (existing) return existing;

		let promise = deferred<Task[]>();

		this.outstanding.set(file.path, promise);
		this.queue.enqueue([file, promise]);
		this.schedule();
		
		return promise;
	}

	/**
	 * Process multiple files in a batch
	 */
	public processBatch(files: TFile[]): Promise<Map<string, Task[]>> {
		const promises: Promise<Task[]>[] = [];
		
		// Queue each file for processing
		for (const file of files) {
			promises.push(this.processFile(file));
		}
		
		// Combine all results into a map
		return Promise.all(promises).then(results => {
			const resultMap = new Map<string, Task[]>();
			files.forEach((file, index) => {
				resultMap.set(file.path, results[index]);
			});
			return resultMap;
		});
	}

	/**
	 * Get task metadata from the file and Obsidian cache
	 */
	private async getTaskMetadata(file: TFile): Promise<TaskMetadata> {
		// Get file content
		const content = await this.vault.cachedRead(file);
		
		// Get file metadata from Obsidian cache
		const fileCache = this.metadataCache.getFileCache(file);
		
		return {
			listItems: fileCache?.listItems,
			content,
			stats: {
				ctime: file.stat.ctime,
				mtime: file.stat.mtime,
				size: file.stat.size,
			}
		};
	}

	/**
	 * Execute next task from the queue
	 */
	private schedule(): void {
		if (this.queue.size() === 0 || !this.active) return;

		const worker = this.availableWorker();
		if (!worker) return;

		const [file, promise] = this.queue.dequeue()!;
		worker.active = [file, promise, Date.now()];

		try {
			this.getTaskMetadata(file).then(metadata => {
				const command: ParseTasksCommand = {
					type: "parseTasks",
					filePath: file.path,
					content: metadata.content,
					stats: metadata.stats,
					metadata: {
						listItems: metadata.listItems || [],
						fileCache: this.metadataCache.getFileCache(file) || undefined
					}
				};
				
				worker.worker.postMessage(command);
			}).catch(error => {
				console.error(`Error reading file ${file.path}:`, error);
				promise.reject(error);
				worker.active = undefined;
				
				// Try to process next task
				this.schedule();
			});
		} catch (error) {
			console.error(`Error processing file ${file.path}:`, error);
			promise.reject(error);
			worker.active = undefined;
			
			// Try to process next task
			this.schedule();
		}
	}

	/**
	 * Handle worker completion and process result
	 */
	private finish(worker: PoolWorker, data: IndexerResult): void {
		if (!worker.active) {
			console.log(
				"Received a stale worker message. Ignoring.",
				data
			);
			return;
		}

		const [file, promise, start] = worker.active;

		// Resolve or reject the promise based on result
		if (data.type === "error") {
			promise.reject(new Error((data as ErrorResult).error));
		} else if (data.type === "parseResult") {
			const parseResult = data as TaskParseResult;
			promise.resolve(parseResult.tasks);
		} else if (data.type === "batchResult") {
			// For batch results, we handle differently as we don't have tasks directly
			promise.reject(new Error("Batch results should be handled by processBatch"));
		} else {
			promise.reject(new Error(`Unexpected result type: ${(data as any).type}`));
		}

		// Remove from outstanding tasks
		this.outstanding.delete(file.path);

		// Check if we should remove this worker (if we're over capacity)
		if (this.workers.size > this.options.maxWorkers) {
			this.workers.delete(worker.id);
			this.terminate(worker);
		} else {
			// Calculate delay based on CPU utilization target
			const now = Date.now();
			const processingTime = now - start;
			const throttle = Math.max(0.1, this.options.cpuUtilization) - 1.0;
			const delay = processingTime * throttle;

			worker.active = undefined;

			if (delay <= 0) {
				worker.availableAt = now;
				this.schedule();
			} else {
				worker.availableAt = now + delay;
				setTimeout(() => this.schedule(), delay);
			}
		}
	}

	/**
	 * Get an available worker
	 */
	private availableWorker(): PoolWorker | undefined {
		const now = Date.now();
		
		// Find a worker that's not busy and is available
		for (const worker of this.workers.values()) {
			if (!worker.active && worker.availableAt <= now) {
				return worker;
			}
		}

		// Create a new worker if we haven't reached capacity
		if (this.workers.size < this.options.maxWorkers) {
			const worker = this.newWorker();
			this.workers.set(worker.id, worker);
			return worker;
		}

		return undefined;
	}

	/**
	 * Terminate a worker
	 */
	private terminate(worker: PoolWorker): void {
		worker.worker.terminate();
		
		if (worker.active) {
			worker.active[1].reject("Terminated");
			worker.active = undefined;
		}
		
		this.log(`Terminated worker #${worker.id}`);
	}

	/**
	 * Reset throttling for all workers
	 */
	public unthrottle(): void {
		const now = Date.now();
		for (const worker of this.workers.values()) {
			worker.availableAt = now;
		}
		this.schedule();
	}

	/**
	 * Shutdown the worker pool
	 */
	public onunload(): void {
		this.active = false;

		// Terminate all workers
		for (const worker of this.workers.values()) {
			this.terminate(worker);
			this.workers.delete(worker.id);
		}

		// Clear all remaining queued tasks and reject their promises
		while (!this.queue.isEmpty()) {
			const [_, promise] = this.queue.dequeue()!;
			promise.reject("Terminated");
		}

		this.log("Worker pool shut down");
	}

	/**
	 * Get the number of pending tasks
	 */
	public getPendingTaskCount(): number {
		return this.queue.size();
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
