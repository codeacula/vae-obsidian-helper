import { Plugin } from "obsidian";
import { moveToArchiveFolder } from "src/FileHelper";

export default class VaePlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "process-thought",
			name: "Process Thought",
			callback: () => this.processThought(),
		});

		this.addRibbonIcon("checkmark", "Process Thought", () =>
			this.processThought()
		);
	}

	private async processThought() {
		const { workspace, vault } = this.app;

		const file = workspace.getActiveFile();
		if (!file) return;

		const now = new Date();
		const isoNow = now.toISOString();
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			fm["note-status"] = "processed";
			fm["processed"] = isoNow;
		});

		const content = await vault.read(file);
		const cleaned = content.replace(/```meta-bind-button[\s\S]*?```/, "");
		await vault.modify(file, cleaned);

		moveToArchiveFolder(vault, file, now).catch((err) => {
			console.error("Failed to move file:", err);
		});
	}
}
