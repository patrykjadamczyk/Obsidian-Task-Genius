/**
 * DOM helpers for testing Obsidian components
 */

// Extend HTMLElement to include Obsidian-specific methods
declare global {
	interface HTMLElement {
		empty(): void;
		addClass(className: string): void;
		removeClass(className: string): void;
		createDiv(className?: string): HTMLElement;
		createEl(tagName: string, options?: { cls?: string; attr?: Record<string, string>; text?: string }): HTMLElement;
	}
}

// Add Obsidian-specific methods to HTMLElement prototype
if (typeof HTMLElement !== 'undefined') {
	HTMLElement.prototype.empty = function() {
		this.innerHTML = '';
	};

	HTMLElement.prototype.addClass = function(className: string) {
		this.classList.add(className);
	};

	HTMLElement.prototype.removeClass = function(className: string) {
		this.classList.remove(className);
	};

	HTMLElement.prototype.createDiv = function(className?: string) {
		const div = document.createElement('div');
		if (className) {
			div.className = className;
		}
		this.appendChild(div);
		return div;
	};

	HTMLElement.prototype.createEl = function(tagName: string, options?: { cls?: string; attr?: Record<string, string>; text?: string }) {
		const el = document.createElement(tagName);
		
		if (options?.cls) {
			el.className = options.cls;
		}
		
		if (options?.attr) {
			Object.entries(options.attr).forEach(([key, value]) => {
				el.setAttribute(key, value);
			});
		}
		
		if (options?.text) {
			el.textContent = options.text;
		}
		
		this.appendChild(el);
		return el;
	};
}

export {};
