import VaePlugin from "main";
import { Notice, TFile, TFolder, normalizePath } from "obsidian";
import { FileHelper } from "./FileHelper";

export class ProjectModule {
	private plugin: VaePlugin;
	private projectFolder: string;
	private projectTemplate?: string;

	constructor(plugin: VaePlugin) {
		this.plugin = plugin;
		this.projectFolder = plugin.settings?.projectFolder || "/My Projects";
		this.projectTemplate = plugin.settings?.projectTemplate;

		// Example: Register a command and ribbon icon for quick processing
		this.plugin.addCommand({
			id: "process-active-project-note",
			name: "Process Active Project Note",
			callback: () => this.processActiveProjectNote(),
		});
		this.plugin.addRibbonIcon(
			"briefcase",
			"Process Active Project Note",
			() => this.processActiveProjectNote()
		);
	}

	// Original API: create a new project folder structure and note
        public async createProject(
                name: string
        ): Promise<{ projectFile: TFile; projectFolder: TFolder }> {
                const vault = this.plugin.app.vault;
                const cleanName = FileHelper.sanitizeName(name);
                // Ensure projects folder exists
                const folderPath = normalizePath(this.projectFolder);
                let folder = vault.getAbstractFileByPath(folderPath);
                if (!folder) {
                        try {
                                folder = await vault.createFolder(folderPath);
                        } catch (err) {
                                new Notice(`Failed to create folder ${folderPath}`);
                                throw err;
                        }
                }
                if (!(folder instanceof TFolder)) {
                        throw new Error(`Path exists but is not a folder: ${folderPath}`);
                }

                let projectFolderPath = normalizePath(`${this.projectFolder}/${cleanName}`);
                projectFolderPath = await FileHelper.getUniqueFolderPath(vault, projectFolderPath);
                let projectNotePath = normalizePath(`${projectFolderPath}/${cleanName}.md`);
                projectNotePath = await FileHelper.getUniqueFilePath(vault, projectNotePath);

		// Create project folder
                let projectFolder = vault.getAbstractFileByPath(projectFolderPath);
                if (!projectFolder) {
                        try {
                                projectFolder = await vault.createFolder(projectFolderPath);
                        } catch (err) {
                                new Notice(`Failed to create folder ${projectFolderPath}`);
                                throw err;
                        }
                }
                if (!(projectFolder instanceof TFolder)) {
                        throw new Error(
                                `Path exists but is not a folder: ${projectFolderPath}`
                        );
                }

		// Create subfolders
		await FileHelper.createFolderIfNotExists(
			normalizePath(`${projectFolderPath}/Notes`),
			vault
		);
		await FileHelper.createFolderIfNotExists(
			normalizePath(`${projectFolderPath}/Tasks`),
			vault
		);

                // Create project note from template
                let content = `# ${cleanName}\n`;
                if (this.projectTemplate) {
                        const templateFile = vault.getAbstractFileByPath(
                                this.projectTemplate
                        );
                        if (templateFile instanceof TFile) {
                                content = await vault.read(templateFile);
                                content = content.replace(/\{\{name\}\}/g, cleanName);
                        }
                }
                let projectFile: TFile;
                try {
                        projectFile = await vault.create(projectNotePath, content);
                } catch (err) {
                        new Notice(`Failed to create file ${projectNotePath}`);
                        throw err;
                }
                return { projectFile, projectFolder: projectFolder as TFolder };
        }

	// Original API: get list of all project folders for selection
	public async getProjectFolders(): Promise<string[]> {
		const vault = this.plugin.app.vault;
		const projectsFolder = vault.getAbstractFileByPath(
			normalizePath(this.projectFolder)
		);
		if (!(projectsFolder instanceof TFolder)) {
			return [];
		}
		return projectsFolder.children
			.filter((child) => child instanceof TFolder)
			.map((folder) => folder.name);
	}

	// Example: process the active file as a project note (for command/ribbon)
	public async processActiveProjectNote() {
		const { workspace, vault } = this.plugin.app;
		const file = workspace.getActiveFile();
		if (!file) return;

		const now = new Date();
		const isoNow = now.toISOString();
		await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
			fm["project-status"] = "processed";
			fm["processed"] = isoNow;
		});

		const content = await vault.read(file);
		const cleaned = content.replace(/```meta-bind-button[\s\S]*?```/, "");
		await vault.modify(file, cleaned);

		await FileHelper.moveToArchiveFolder(vault, file, now);
	}
}
