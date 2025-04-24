// Mock for @codemirror/view

export class EditorView {
	state: any;

	constructor(config: any = {}) {
		this.state = config.state || null;
	}

	dispatch(transaction: any) {
		// Mock implementation
	}
}

export class WidgetType {
	eq(other: any): boolean {
		return false;
	}

	toDOM(): HTMLElement {
		return document.createElement("div");
	}

	ignoreEvent(event: Event): boolean {
		return false;
	}
}
