import VaePlugin from "main";
import { TFile, TFolder, normalizePath } from "obsidian";
import { FileHelper } from "./FileHelper";

export class PersonModule {
	private plugin: VaePlugin;
	private peopleFolder: string;
	private personTemplate?: string;

	constructor(plugin: VaePlugin) {
		this.plugin = plugin;
		this.peopleFolder =
			plugin.settings?.peopleFolder || "/My Knowledge/People";
		this.personTemplate = plugin.settings?.personTemplate;

		// Example: Register a command and ribbon icon for quick processing
		this.plugin.addCommand({
			id: "process-active-person-note",
			name: "Process Active Person Note",
			callback: () => this.processActivePersonNote(),
		});
		this.plugin.addRibbonIcon("user", "Process Active Person Note", () =>
			this.processActivePersonNote()
		);
	}

	// Original API: create a new person note with all folders and template
	public async createPersonNote(name: string): Promise<TFile> {
		const vault = this.plugin.app.vault;
		// Ensure people folder exists
		const folderPath = normalizePath(this.peopleFolder);
		let folder = vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			folder = await vault.createFolder(folderPath);
		}
		if (!(folder instanceof TFolder)) {
			throw new Error(`Path exists but is not a folder: ${folderPath}`);
		}

		// Create person's main folder
		const personFolderPath = normalizePath(`${this.peopleFolder}/${name}`);
		let personFolder = vault.getAbstractFileByPath(personFolderPath);
		if (!personFolder) {
			personFolder = await vault.createFolder(personFolderPath);
		}
		if (!(personFolder instanceof TFolder)) {
			throw new Error(
				`Path exists but is not a folder: ${personFolderPath}`
			);
		}

		// Create Interactions subfolder
		const interactionsFolderPath = normalizePath(
			`${personFolderPath}/Interactions`
		);
		const interactionsFolder = vault.getAbstractFileByPath(
			interactionsFolderPath
		);
		if (!interactionsFolder) {
			await vault.createFolder(interactionsFolderPath);
		}

		// Create Media subfolder
		const mediaFolderPath = normalizePath(`${personFolderPath}/Media`);
		const mediaFolder = vault.getAbstractFileByPath(mediaFolderPath);
		if (!mediaFolder) {
			await vault.createFolder(mediaFolderPath);
		}

		// Create person note from template
		const notePath = normalizePath(`${personFolderPath}/${name}.md`);
		let content = `# ${name}\n`;
		if (this.personTemplate) {
			const templateFile = vault.getAbstractFileByPath(
				this.personTemplate
			);
			if (templateFile instanceof TFile) {
				content = await vault.read(templateFile);
				content = content.replace(/\{\{name\}\}/g, name);
			}
		}
		return vault.create(notePath, content);
	}

	// Example: process the active file as a person note (for command/ribbon)
	public async processActivePersonNote() {
		const { workspace, vault } = this.plugin.app;
		const file = workspace.getActiveFile();
		if (!file) return;

		const now = new Date();
		const isoNow = now.toISOString();
		await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
			fm["person-status"] = "processed";
			fm["processed"] = isoNow;
		});

		const content = await vault.read(file);
		const cleaned = content.replace(/```meta-bind-button[\s\S]*?```/, "");
		await vault.modify(file, cleaned);

		await FileHelper.moveToArchiveFolder(vault, file, now);
	}
}
