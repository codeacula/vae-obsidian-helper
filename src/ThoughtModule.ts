import { TFile, TFolder, Vault, normalizePath } from "obsidian";

export interface ThoughtModuleOptions {
	vault: Vault;
	thoughtsFolder?: string;
	thoughtTemplate?: string;
	logger?: (msg: string) => void;
}

export class ThoughtModule {
	private vault: Vault;
	private thoughtsFolder: string;
	private thoughtTemplate?: string;
	private logger: (msg: string) => void;

	constructor(options: ThoughtModuleOptions) {
		this.vault = options.vault;
		this.thoughtsFolder = options.thoughtsFolder || "Thoughts";
		this.thoughtTemplate = options.thoughtTemplate;
		this.logger = options.logger || (() => {});
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

	// Creates a new thought note in the thoughts folder, optionally from a template
	async createThoughtNote(title: string): Promise<TFile> {
		await this.ensureFolder();
		const notePath = normalizePath(`${this.thoughtsFolder}/${title}.md`);
		let content = `# ${title}\n`;
		if (this.thoughtTemplate) {
			const templateFile = this.vault.getAbstractFileByPath(
				this.thoughtTemplate
			);
			if (templateFile instanceof TFile) {
				content = await this.vault.read(templateFile);
				content = content.replace(/\{\{title\}\}/g, title);
			} else {
				this.logger(
					`Template not found: ${this.thoughtTemplate}, using default content.`
				);
			}
		}
		this.logger(`Creating thought note: ${notePath}`);
		return this.vault.create(notePath, content);
	}
}
