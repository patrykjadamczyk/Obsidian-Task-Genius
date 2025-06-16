import { Setting } from "obsidian";
import { TaskProgressBarSettingTab } from "../../setting";
import { t } from "../../translations/helper";

export function renderAboutSettingsTab(
	settingTab: TaskProgressBarSettingTab,
	containerEl: HTMLElement
) {
	new Setting(containerEl).setName(t("About") + " Task Genius").setHeading();

	new Setting(containerEl)
		.setName(t("Version"))
		.setDesc(`Task Genius v${settingTab.plugin.manifest.version}`);

	new Setting(containerEl)
		.setName(t("Donate"))
		.setDesc(
			t(
				"If you like this plugin, consider donating to support continued development:"
			)
		)
		.addButton((bt) => {
			bt.buttonEl.outerHTML = `<a href="https://www.buymeacoffee.com/boninall"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=boninall&button_colour=6495ED&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00"></a>`;
		});

	new Setting(containerEl)
		.setName(t("Documentation"))
		.setDesc(t("View the documentation for this plugin"))
		.addButton((button) => {
			button.setButtonText(t("Open Documentation")).onClick(() => {
				window.open("https://taskgenius.md/docs/getting-started");
			});
		});
}
