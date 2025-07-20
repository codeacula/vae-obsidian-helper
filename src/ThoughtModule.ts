import VaePlugin from "main";
import { FileHelper } from "./FileHelper";

export interface ThoughtModuleOptions {
	plugin: VaePlugin;
	logger?: (msg: string) => void;
}

export class ThoughtModule {
	private plugin: VaePlugin;

	constructor(plugin: VaePlugin) {
		this.plugin = plugin;

		this.plugin.addCommand({
			id: "process-thought",
			name: "Process Thought",
			callback: () => this.processThought(),
		});

		this.plugin.addRibbonIcon("checkmark", "Process Thought", () =>
			this.processThought()
		);
	}

	private async processThought() {
		const { workspace, vault } = this.plugin.app;
		const file = workspace.getActiveFile();
		if (!file) return;

		const now = new Date();
		const isoNow = now.toISOString();
		await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
			fm["note-status"] = "processed";
			fm["processed"] = isoNow;
		});

		const content = await vault.read(file);
		const cleaned = content.replace(/```meta-bind-button[\s\S]*?```/, "");
		await vault.modify(file, cleaned);

		await FileHelper.moveToArchiveFolder(vault, file, now);
	}
}
