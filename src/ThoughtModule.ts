import VaePlugin from "main";
import { TFolder, Vault, normalizePath } from "obsidian";
import { FileHelper } from "./FileHelper";

export interface ThoughtModuleOptions {
	plugin: VaePlugin;
	thoughtsFolder?: string;
	thoughtTemplate?: string;
	logger?: (msg: string) => void;
}

export class ThoughtModule {
	private plugin: VaePlugin;
	private vault: Vault;
	private thoughtsFolder: string;
	private thoughtTemplate?: string;
	private logger: (msg: string) => void;

	constructor(options: ThoughtModuleOptions) {
		this.plugin = options.plugin;
		this.vault = options.plugin.app.vault;
		this.thoughtsFolder = options.thoughtsFolder || "Thoughts";
		this.thoughtTemplate = options.thoughtTemplate;
		this.logger = options.logger || (() => {});

		this.plugin.addCommand({
			id: "process-thought",
			name: "Process Thought",
			callback: () => this.processThought(),
		});

		this.plugin.addRibbonIcon("checkmark", "Process Thought", () =>
			this.processThought()
		);
	}

	// Ensures the thoughts folder exists, creates if missing
	async ensureFolder(): Promise<TFolder> {
		const folderPath = normalizePath(this.thoughtsFolder);
		let folder = this.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			this.logger(`Creating folder: ${folderPath}`);
			folder = await this.vault.createFolder(folderPath);
		}
		if (!(folder instanceof TFolder)) {
			throw new Error(`Path exists but is not a folder: ${folderPath}`);
		}
		return folder;
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
