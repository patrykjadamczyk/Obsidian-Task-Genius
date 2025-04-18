import { App, Component } from "obsidian";
import { Task } from "src/utils/types/TaskIndex"; // Adjust path
import { KanbanCardComponent } from "./KanbanCard";
import TaskProgressBarPlugin from "../../index"; // Adjust path

export class KanbanColumnComponent extends Component {
	private element: HTMLElement;
	private contentEl: HTMLElement;
	private cards: KanbanCardComponent[] = [];

	constructor(
		private app: App,
		private plugin: TaskProgressBarPlugin,
		private containerEl: HTMLElement,
		public statusName: string, // e.g., "Todo", "In Progress"
		private tasks: Task[]
	) {
		super();
	}

	override onload(): void {
		this.element = this.containerEl.createDiv({
			cls: "kanban-column",
			attr: { "data-status-name": this.statusName },
		});

		// Column Header
		this.element.createEl("h3", {
			cls: "kanban-column-header",
			text: this.statusName,
		});

		// Column Content (Scrollable Area for Cards, and Drop Zone)
		this.contentEl = this.element.createDiv({
			cls: "kanban-column-content",
		});

		// Render cards
		this.renderCards();
	}

	override onunload(): void {
		this.cards.forEach((card) => card.unload());
		this.cards = [];
		this.element?.remove();
	}

	private renderCards() {
		this.contentEl.empty(); // Clear existing cards
		this.cards.forEach((card) => card.unload()); // Unload previous card components
		this.cards = [];

		this.tasks.forEach((task) => {
			const card = new KanbanCardComponent(
				this.app,
				this.plugin,
				this.contentEl,
				task
			);
			this.addChild(card); // Register for lifecycle
			this.cards.push(card);
			card.load();
		});
	}

	// Optional: Method to add a card component if tasks are updated dynamically
	addCard(task: Task) {
		const card = new KanbanCardComponent(
			this.app,
			this.plugin,
			this.contentEl,
			task
		);
		this.addChild(card);
		this.cards.push(card);
		card.load();
	}

	// Optional: Method to remove a card component
	removeCard(taskId: string) {
		const cardIndex = this.cards.findIndex(
			(c) => c.getTask().id === taskId
		);
		if (cardIndex > -1) {
			const card = this.cards[cardIndex];
			this.removeChild(card); // Unregister
			card.unload(); // Detach DOM element etc.
			this.cards.splice(cardIndex, 1);
		}
	}
}
