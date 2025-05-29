import { Component, debounce } from "obsidian";
import { VirtualScrollCallbacks, ViewportData } from "./TableTypes";

/**
 * Virtual scroll manager for handling large datasets with lazy loading
 */
export class VirtualScrollManager extends Component {
	private scrollContainer: HTMLElement;
	private viewport: ViewportData;
	private rowHeight: number = 40; // Default row height in pixels
	private bufferSize: number = 10; // Number of extra rows to render outside viewport
	private isLoading: boolean = false;
	private totalRows: number = 0;
	private loadedRows: number = 0;

	// Scroll handling
	private lastScrollTop: number = 0;
	private scrollDirection: "up" | "down" = "down";
	private debouncedScrollHandler: () => void;

	constructor(
		private containerEl: HTMLElement,
		private pageSize: number,
		private callbacks: VirtualScrollCallbacks
	) {
		super();

		this.scrollContainer = containerEl;
		this.viewport = {
			startIndex: 0,
			endIndex: 0,
			visibleRows: [],
			totalHeight: 0,
			scrollTop: 0,
		};

		// Create debounced scroll handler
		this.debouncedScrollHandler = debounce(
			this.handleScroll.bind(this),
			16
		);
	}

	onload() {
		this.setupScrollContainer();
		this.setupEventListeners();
	}

	onunload() {
		this.cleanup();
	}

	/**
	 * Setup scroll container
	 */
	private setupScrollContainer() {
		// For table view, we need to find the actual scrollable container
		// which might be the table container, not the table itself
		let scrollableContainer = this.scrollContainer;

		// If the container is not scrollable, look for a parent that is
		if (
			scrollableContainer.style.overflowY !== "auto" &&
			scrollableContainer.style.overflowY !== "scroll"
		) {
			scrollableContainer.style.overflowY = "auto";
		}

		scrollableContainer.style.position = "relative";
	}

	/**
	 * Setup event listeners
	 */
	private setupEventListeners() {
		this.scrollContainer.addEventListener(
			"scroll",
			this.debouncedScrollHandler
		);

		// Handle resize events
		window.addEventListener("resize", this.handleResize.bind(this));
	}

	/**
	 * Update content and recalculate viewport
	 */
	public updateContent(totalRowCount: number) {
		this.totalRows = totalRowCount;
		this.calculateViewport();
		this.updateVirtualHeight();
	}

	/**
	 * Handle scroll events
	 */
	public handleScroll() {
		const scrollTop = this.scrollContainer.scrollTop;
		const scrollHeight = this.scrollContainer.scrollHeight;
		const clientHeight = this.scrollContainer.clientHeight;

		// Update scroll direction
		this.scrollDirection = scrollTop > this.lastScrollTop ? "down" : "up";
		this.lastScrollTop = scrollTop;

		// Update viewport
		this.viewport.scrollTop = scrollTop;
		this.calculateViewport();

		// Check if we need to load more data
		const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
		if (
			scrollPercentage > 0.8 &&
			!this.isLoading &&
			this.loadedRows < this.totalRows
		) {
			this.loadMoreData();
		}

		// Notify callback
		this.callbacks.onScroll(scrollTop);
	}

	/**
	 * Calculate visible viewport
	 */
	private calculateViewport() {
		const scrollTop = this.viewport.scrollTop;
		const containerHeight = this.scrollContainer.clientHeight;

		// Calculate visible row range
		const startIndex = Math.max(
			0,
			Math.floor(scrollTop / this.rowHeight) - this.bufferSize
		);
		const visibleRowCount = Math.ceil(containerHeight / this.rowHeight);
		const endIndex = Math.min(
			this.totalRows - 1,
			startIndex + visibleRowCount + this.bufferSize * 2
		);

		// Update viewport
		this.viewport.startIndex = startIndex;
		this.viewport.endIndex = endIndex;
		this.viewport.totalHeight = this.totalRows * this.rowHeight;

		// Update virtual spacer height
		this.updateVirtualHeight();
	}

	/**
	 * Update virtual spacer height to maintain scroll position
	 */
	private updateVirtualHeight() {
		// For table view, we don't use a virtual spacer
		// The table rows themselves provide the height
		// This method is kept for compatibility but does nothing
	}

	/**
	 * Load more data
	 */
	private loadMoreData() {
		if (this.isLoading) return;

		this.isLoading = true;
		this.callbacks.onLoadMore();
	}

	/**
	 * Load next batch of data
	 */
	public loadNextBatch() {
		const nextBatchSize = Math.min(
			this.pageSize,
			this.totalRows - this.loadedRows
		);
		if (nextBatchSize <= 0) {
			this.isLoading = false;
			return;
		}

		// Simulate loading delay (in real implementation, this would be async data loading)
		setTimeout(() => {
			this.loadedRows += nextBatchSize;
			this.isLoading = false;

			// Recalculate viewport after loading
			this.calculateViewport();
		}, 100);
	}

	/**
	 * Get current viewport data
	 */
	public getViewport(): ViewportData {
		return { ...this.viewport };
	}

	/**
	 * Scroll to specific row
	 */
	public scrollToRow(rowIndex: number, behavior: ScrollBehavior = "smooth") {
		const targetScrollTop = rowIndex * this.rowHeight;
		this.scrollContainer.scrollTo({
			top: targetScrollTop,
			behavior: behavior,
		});
	}

	/**
	 * Scroll to top
	 */
	public scrollToTop(behavior: ScrollBehavior = "smooth") {
		this.scrollToRow(0, behavior);
	}

	/**
	 * Scroll to bottom
	 */
	public scrollToBottom(behavior: ScrollBehavior = "smooth") {
		this.scrollToRow(this.totalRows - 1, behavior);
	}

	/**
	 * Set row height (affects all calculations)
	 */
	public setRowHeight(height: number) {
		this.rowHeight = height;
		this.calculateViewport();
		this.updateVirtualHeight();
	}

	/**
	 * Set buffer size (number of extra rows to render)
	 */
	public setBufferSize(size: number) {
		this.bufferSize = size;
		this.calculateViewport();
	}

	/**
	 * Check if a row is currently visible
	 */
	public isRowVisible(rowIndex: number): boolean {
		return (
			rowIndex >= this.viewport.startIndex &&
			rowIndex <= this.viewport.endIndex
		);
	}

	/**
	 * Get visible row indices
	 */
	public getVisibleRowIndices(): number[] {
		const indices: number[] = [];
		for (
			let i = this.viewport.startIndex;
			i <= this.viewport.endIndex;
			i++
		) {
			indices.push(i);
		}
		return indices;
	}

	/**
	 * Handle container resize
	 */
	private handleResize() {
		// Recalculate viewport on resize
		this.calculateViewport();
	}

	/**
	 * Reset virtual scroll state
	 */
	public reset() {
		this.totalRows = 0;
		this.loadedRows = 0;
		this.isLoading = false;
		this.lastScrollTop = 0;
		this.viewport = {
			startIndex: 0,
			endIndex: 0,
			visibleRows: [],
			totalHeight: 0,
			scrollTop: 0,
		};
		this.scrollToTop("auto");
	}

	/**
	 * Get scroll statistics
	 */
	public getScrollStats() {
		const scrollTop = this.viewport.scrollTop;
		const scrollHeight = this.scrollContainer.scrollHeight;
		const clientHeight = this.scrollContainer.clientHeight;
		const scrollPercentage =
			scrollHeight > 0 ? (scrollTop + clientHeight) / scrollHeight : 0;

		return {
			scrollTop,
			scrollHeight,
			clientHeight,
			scrollPercentage,
			direction: this.scrollDirection,
			visibleRowCount:
				this.viewport.endIndex - this.viewport.startIndex + 1,
			totalRows: this.totalRows,
			loadedRows: this.loadedRows,
			isLoading: this.isLoading,
		};
	}

	/**
	 * Enable or disable virtual scrolling
	 */
	public setEnabled(enabled: boolean) {
		if (enabled) {
			this.scrollContainer.addEventListener(
				"scroll",
				this.debouncedScrollHandler
			);
		} else {
			this.scrollContainer.removeEventListener(
				"scroll",
				this.debouncedScrollHandler
			);
		}
	}

	/**
	 * Cleanup resources
	 */
	private cleanup() {
		this.scrollContainer.removeEventListener(
			"scroll",
			this.debouncedScrollHandler
		);
		window.removeEventListener("resize", this.handleResize.bind(this));

		// No virtual spacer to remove for table view
	}
}
