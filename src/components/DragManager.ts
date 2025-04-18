import { App, Component, Point, TFile } from "obsidian";

export interface DragStartEvent {
	element: HTMLElement;
	startX: number;
	startY: number;
	event: PointerEvent | MouseEvent | TouchEvent;
}

export interface DragMoveEvent extends DragStartEvent {
	currentX: number;
	currentY: number;
	deltaX: number;
	deltaY: number;
}

export interface DragEndEvent extends DragMoveEvent {
	dropTarget: HTMLElement | null;
}

export interface DragManagerOptions {
	draggableSelector?: string; // Selector for elements *within* the container that are draggable
	container: HTMLElement; // The element that contains draggable items and listens for events
	onDragStart?: (data: DragStartEvent) => void | boolean; // Return false to cancel drag
	onDragMove?: (data: DragMoveEvent) => void;
	onDragEnd?: (data: DragEndEvent) => void;
	dragHandleSelector?: string; // Optional selector for a specific drag handle within the draggable element
	cloneElement?: boolean | (() => HTMLElement); // Option to drag a clone
	dragClass?: string; // Class added to the element being dragged (or its clone)
	ghostClass?: string; // Class added to the original element when dragging a clone
	dropZoneSelector?: string; // Selector for valid drop zones
}

export class DragManager extends Component {
	private options: DragManagerOptions;
	private isDragging = false;
	private startX = 0;
	private startY = 0;
	private currentX = 0;
	private currentY = 0;
	private draggedElement: HTMLElement | null = null;
	private originalElement: HTMLElement | null = null; // Store original if cloning
	private startEventData: DragStartEvent | null = null;
	private boundHandlePointerDown: (event: PointerEvent) => void;
	private boundHandlePointerMove: (event: PointerEvent) => void;
	private boundHandlePointerUp: (event: PointerEvent) => void;

	constructor(options: DragManagerOptions) {
		super();
		this.options = options;
		this.boundHandlePointerDown = this.handlePointerDown.bind(this);
		this.boundHandlePointerMove = this.handlePointerMove.bind(this);
		this.boundHandlePointerUp = this.handlePointerUp.bind(this);
	}

	override onload(): void {
		this.registerListeners();
	}

	override onunload(): void {
		// Listeners are unregistered automatically by Component
		if (this.isDragging) {
			// Clean up if unloaded mid-drag
			this.handlePointerUp(
				new PointerEvent("pointerup") /* fake event */
			);
		}
	}

	private registerListeners(): void {
		this.registerDomEvent(
			this.options.container,
			"pointerdown",
			this.boundHandlePointerDown
		);
	}

	private handlePointerDown(event: PointerEvent): void {
		if (event.button !== 0) return; // Only main button

		let targetElement = event.target as HTMLElement;

		// Check for drag handle if specified
		if (this.options.dragHandleSelector) {
			const handle = targetElement.closest(
				this.options.dragHandleSelector
			);
			if (!handle) return; // Clicked outside handle

			// If handle is found, the draggable element is its parent (or ancestor matching draggableSelector)
			targetElement = handle.closest(
				this.options.draggableSelector || "*"
			) as HTMLElement;
			if (
				!targetElement ||
				!this.options.container.contains(targetElement)
			)
				return;
		} else if (this.options.draggableSelector) {
			// Find the closest draggable ancestor if draggableSelector is specified
			targetElement = targetElement.closest(
				this.options.draggableSelector
			) as HTMLElement;
			if (
				!targetElement ||
				!this.options.container.contains(targetElement)
			)
				return;
		} else if (targetElement !== this.options.container) {
			// If no selector, assume direct children might be draggable, but check container boundary
			if (!this.options.container.contains(targetElement)) return;
			// Potentially allow dragging direct children if no selector specified
		} else {
			return; // Clicked directly on the container background
		}

		this.isDragging = true;
		this.startX = event.clientX;
		this.startY = event.clientY;
		this.currentX = this.startX;
		this.currentY = this.startY;
		this.originalElement = targetElement; // Store the original element

		// --- Cloning Logic ---
		if (this.options.cloneElement) {
			if (typeof this.options.cloneElement === "function") {
				this.draggedElement = this.options.cloneElement();
			} else {
				this.draggedElement = targetElement.cloneNode(
					true
				) as HTMLElement;
			}
			// Position the clone absolutely
			const rect = targetElement.getBoundingClientRect();
			this.draggedElement.style.position = "absolute";
			this.draggedElement.style.left = `${rect.left}px`;
			this.draggedElement.style.top = `${rect.top}px`;
			this.draggedElement.style.width = `${rect.width}px`;
			this.draggedElement.style.height = `${rect.height}px`;
			this.draggedElement.style.pointerEvents = "none"; // Prevent clone from interfering with pointer events
			this.draggedElement.style.zIndex = "1000"; // Ensure clone is on top
			document.body.appendChild(this.draggedElement); // Append to body to avoid container clipping

			if (this.options.ghostClass) {
				this.originalElement.classList.add(this.options.ghostClass);
			}
		} else {
			this.draggedElement = targetElement;
		}

		if (this.options.dragClass && this.draggedElement) {
			this.draggedElement.classList.add(this.options.dragClass);
		}
		// --- End Cloning Logic ---

		this.startEventData = {
			element: this.draggedElement!,
			startX: this.startX,
			startY: this.startY,
			event: event,
		};

		// Check if drag should proceed
		const proceed = this.options.onDragStart?.(this.startEventData);
		if (proceed === false) {
			this.resetDragState();
			return;
		}

		// Prevent default text selection behavior during drag
		// event.preventDefault(); // Careful: This can prevent other desired behaviors like scrolling

		// Add global listeners
		document.addEventListener("pointermove", this.boundHandlePointerMove);
		document.addEventListener("pointerup", this.boundHandlePointerUp);
	}

	private handlePointerMove(event: PointerEvent): void {
		if (!this.isDragging || !this.draggedElement || !this.startEventData)
			return;

		// event.preventDefault(); // Prevent text selection, etc.

		this.currentX = event.clientX;
		this.currentY = event.clientY;
		const deltaX = this.currentX - this.startX;
		const deltaY = this.currentY - this.startY;

		// Update clone position if cloning
		if (this.options.cloneElement) {
			const startRect = this.originalElement!.getBoundingClientRect();
			this.draggedElement.style.left = `${startRect.left + deltaX}px`;
			this.draggedElement.style.top = `${startRect.top + deltaY}px`;
		}
		// Note: If not cloning, the element's movement might be handled by CSS transforms or other means via the callback

		const moveEventData: DragMoveEvent = {
			...this.startEventData,
			currentX: this.currentX,
			currentY: this.currentY,
			deltaX: deltaX,
			deltaY: deltaY,
			event: event,
		};

		this.options.onDragMove?.(moveEventData);
	}

	private handlePointerUp(event: PointerEvent): void {
		if (!this.isDragging || !this.draggedElement || !this.startEventData)
			return;

		// event.preventDefault();

		// Determine potential drop target
		let dropTarget: HTMLElement | null = null;
		if (this.options.dropZoneSelector) {
			// Hide the clone temporarily to accurately find the element underneath
			const originalDisplay = this.draggedElement.style.display;
			if (this.options.cloneElement) {
				this.draggedElement.style.display = "none";
			}

			const elementUnderPointer = document.elementFromPoint(
				this.currentX,
				this.currentY
			);

			// Restore clone visibility
			if (this.options.cloneElement) {
				this.draggedElement.style.display = originalDisplay;
			}

			if (elementUnderPointer) {
				dropTarget = elementUnderPointer.closest(
					this.options.dropZoneSelector
				) as HTMLElement;
			}
		}

		const endEventData: DragEndEvent = {
			...this.startEventData,
			currentX: this.currentX,
			currentY: this.currentY,
			deltaX: this.currentX - this.startX,
			deltaY: this.currentY - this.startY,
			event: event,
			dropTarget: dropTarget,
		};

		this.options.onDragEnd?.(endEventData);

		this.resetDragState();
	}

	private resetDragState(): void {
		// Clean up global listeners
		document.removeEventListener(
			"pointermove",
			this.boundHandlePointerMove
		);
		document.removeEventListener("pointerup", this.boundHandlePointerUp);

		if (this.draggedElement) {
			if (this.options.dragClass) {
				this.draggedElement.classList.remove(this.options.dragClass);
			}
			// Remove clone if it exists
			if (this.options.cloneElement) {
				this.draggedElement.remove();
			}
		}
		if (this.originalElement && this.options.ghostClass) {
			this.originalElement.classList.remove(this.options.ghostClass);
		}

		this.isDragging = false;
		this.draggedElement = null;
		this.originalElement = null;
		this.startEventData = null;
		this.startX = 0;
		this.startY = 0;
		this.currentX = 0;
		this.currentY = 0;
	}
}
