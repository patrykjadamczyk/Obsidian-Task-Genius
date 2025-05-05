import { App, ButtonComponent, Modal } from "obsidian";
import TaskProgressBarPlugin from "../index";
import "../styles/modal.css";

export class ConfirmModal extends Modal {
	constructor(
		plugin: TaskProgressBarPlugin,
		public params: {
			title: string;
			message: string;
			confirmText: string;
			cancelText: string;
			onConfirm: (confirmed: boolean) => void;
		}
	) {
		super(plugin.app);
	}

	onOpen() {
		this.titleEl.setText(this.params.title);
		this.contentEl.setText(this.params.message);

		const buttonsContainer = this.contentEl.createEl("div", {
			cls: "confirm-modal-buttons",
		});

		new ButtonComponent(buttonsContainer)
			.setButtonText(this.params.confirmText)
			.setCta()
			.onClick(() => {
				this.params.onConfirm(true);
				this.close();
			});

		new ButtonComponent(buttonsContainer)
			.setButtonText(this.params.cancelText)
			.setCta()
			.onClick(() => {
				this.params.onConfirm(false);
				this.close();
			});
	}

	onClose() {
		this.contentEl.empty();
	}
}
