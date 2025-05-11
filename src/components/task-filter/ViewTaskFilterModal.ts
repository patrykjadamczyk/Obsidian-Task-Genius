import { App } from "obsidian";
import { Modal } from "obsidian";
import { TaskFilterComponent } from "./ViewTaskFilter";

export class ViewTaskFilterModal extends Modal {
	private taskFilterComponent: TaskFilterComponent;
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.taskFilterComponent = new TaskFilterComponent(
			this.contentEl,
			this.app
		);
	}

	onClose() {
		const { contentEl } = this;
		if (this.taskFilterComponent) {
			this.taskFilterComponent.onunload();
		}
		contentEl.empty();
	}
}
