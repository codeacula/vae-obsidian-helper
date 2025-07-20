import { TFile, TFolder, Vault, normalizePath } from "obsidian";
import { TemplaterHelper } from "./TemplaterHelper";

export interface PersonModuleOptions {
	vault: Vault;
	peopleFolder?: string;
	personTemplate?: string;
	templaterHelper?: TemplaterHelper;
	logger?: (msg: string) => void;
}

export class PersonModule {
	private vault: Vault;
	private peopleFolder: string;
	private personTemplate?: string;
	private templaterHelper?: TemplaterHelper;
	private logger: (msg: string) => void;

	constructor(options: PersonModuleOptions) {
		this.vault = options.vault;
		this.peopleFolder = options.peopleFolder || "/My Knowledge/People";
		this.personTemplate = options.personTemplate;
		this.templaterHelper = options.templaterHelper;
		this.logger = options.logger || (() => {});
	}

	// Ensures the people folder exists, creates if missing
	async ensureFolder(): Promise<TFolder> {
		const folderPath = normalizePath(this.peopleFolder);
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

	// Creates a new person note with required folder structure
	async createPersonNote(name: string): Promise<TFile> {
		await this.ensureFolder();

		// Create person's main folder
		const personFolderPath = normalizePath(`${this.peopleFolder}/${name}`);
		let personFolder = this.vault.getAbstractFileByPath(personFolderPath);
		if (!personFolder) {
			this.logger(`Creating person folder: ${personFolderPath}`);
			personFolder = await this.vault.createFolder(personFolderPath);
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
		const interactionsFolder = this.vault.getAbstractFileByPath(
			interactionsFolderPath
		);
		if (!interactionsFolder) {
			this.logger(
				`Creating interactions folder: ${interactionsFolderPath}`
			);
			await this.vault.createFolder(interactionsFolderPath);
		}

		// Create Media subfolder
		const mediaFolderPath = normalizePath(`${personFolderPath}/Media`);
		const mediaFolder = this.vault.getAbstractFileByPath(mediaFolderPath);
		if (!mediaFolder) {
			this.logger(`Creating media folder: ${mediaFolderPath}`);
			await this.vault.createFolder(mediaFolderPath);
		}

		// Create person note from template
		const notePath = normalizePath(`${personFolderPath}/${name}.md`);
		let content = `# ${name}\n`;
		if (this.personTemplate) {
			const templateFile = this.vault.getAbstractFileByPath(
				this.personTemplate
			);
			if (templateFile instanceof TFile) {
				content = await this.vault.read(templateFile);
				content = content.replace(/\{\{name\}\}/g, name);
			} else {
				this.logger(
					`Template not found: ${this.personTemplate}, using default content.`
				);
			}
		}
		this.logger(`Creating person note: ${notePath}`);
		return this.vault.create(notePath, content);
	}
}
