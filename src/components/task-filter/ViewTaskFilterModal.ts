import { App } from "obsidian";
import { Modal } from "obsidian";
import { TaskFilterComponent, RootFilterState } from "./ViewTaskFilter";

export class ViewTaskFilterModal extends Modal {
	public taskFilterComponent: TaskFilterComponent;
	public filterCloseCallback:
		| ((filterState?: RootFilterState) => void)
		| null = null;

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

		// 获取过滤状态并触发回调
		let filterState: RootFilterState | undefined = undefined;
		if (this.taskFilterComponent) {
			try {
				filterState = this.taskFilterComponent.getFilterState();
				this.taskFilterComponent.onunload();
			} catch (error) {
				console.error(
					"Failed to get filter state before modal close",
					error
				);
			}
		}

		contentEl.empty();

		// 调用自定义关闭回调
		if (this.filterCloseCallback) {
			try {
				this.filterCloseCallback(filterState);
			} catch (error) {
				console.error("Error in filter close callback", error);
			}
		}
	}
}
