import { App, Modal, Notice } from "obsidian";
import { InlineSuggest, getProjectSuggestions } from "./SuggestModals";
import VaePlugin from "main";

export type NewItemType = "Person" | "Project" | "Task" | "Todo" | "Thought";

export interface NewItemModalOptions {
    type: NewItemType;
}

/**
 * Unified modal for creating new Vae items.
 */
export class NewItemModal extends Modal {
    private plugin: VaePlugin;
    private type: NewItemType;
    private projectSuggest?: InlineSuggest;
    private selectedProject = "";
    private nameInput!: HTMLInputElement;
    private createButton!: HTMLButtonElement;

    constructor(app: App, plugin: VaePlugin, type: NewItemType) {
        super(app);
        this.plugin = plugin;
        this.type = type;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass("vae-modal");

        const title = contentEl.createEl("h2", {
            text: `Create ${this.type}`,
            cls: "vae-modal-title",
        });

        const typeSelect = contentEl.createEl("select", {
            cls: "vae-select",
        });
        ["Person", "Project", "Task", "Todo", "Thought"].forEach((t) => {
            const opt = typeSelect.createEl("option", { text: t });
            if (t === this.type) opt.selected = true;
        });
        typeSelect.onchange = () => {
            this.type = typeSelect.value as NewItemType;
            this.renderFields();
        };
        contentEl.appendChild(typeSelect);

        this.renderFields();
    }

    private renderFields() {
        const { contentEl } = this;
        contentEl.querySelectorAll(".vae-field").forEach((el) => el.remove());
        this.projectSuggest?.destroy();
        this.selectedProject = "";

        const field = contentEl.createDiv("vae-field");
        const label = field.createEl("label", { text: "Name", cls: "vae-label" });
        this.nameInput = field.createEl("input", {
            type: "text",
            cls: "vae-input",
        });

        if (this.type === "Task") {
            const projField = contentEl.createDiv("vae-field");
            projField.createEl("label", { text: "Project", cls: "vae-label" });
            const projInput = projField.createEl("input", {
                type: "text",
                cls: "vae-input",
            });
            this.projectSuggest = new InlineSuggest(
                this.app,
                projInput,
                (q) =>
                    getProjectSuggestions(this.app, q, this.plugin.settings.projectFolder),
                (sel) => (this.selectedProject = sel)
            );
        }

        const btnContainer = contentEl.createDiv("vae-button-container");
        this.createButton = btnContainer.createEl("button", {
            text: "Create",
            cls: "mod-cta vae-button",
        });
        const cancelBtn = btnContainer.createEl("button", {
            text: "Cancel",
            cls: "vae-button",
        });
        cancelBtn.onclick = () => this.close();
        this.createButton.onclick = () => this.submit();

        this.nameInput.addEventListener("input", () => this.validate());
        this.validate();
    }

    private validate() {
        const valid = this.nameInput.value.trim().length > 0 && (this.type !== "Task" || this.selectedProject);
        this.createButton.disabled = !valid;
    }

    private async submit() {
        const name = this.nameInput.value.trim();
        if (!name) return;
        try {
            switch (this.type) {
                case "Person":
                    const person = await this.plugin.personModule.createPersonNote(name);
                    await this.app.workspace.getLeaf().openFile(person);
                    break;
                case "Project":
                    const proj = await this.plugin.projectModule.createProject(name);
                    await this.app.workspace.getLeaf().openFile(proj.projectFile);
                    break;
                case "Task":
                    if (!this.selectedProject) return;
                    const task = await this.plugin.taskModule.createTask(this.selectedProject, name);
                    await this.app.workspace.getLeaf().openFile(task);
                    break;
                case "Todo":
                    const todo = await this.plugin.taskModule.createTodo(name, this.plugin.settings.todoFolder);
                    await this.app.workspace.getLeaf().openFile(todo);
                    break;
                case "Thought":
                    const templ = this.plugin.templaterHelper;
                    if (templ.isAvailable) {
                        await templ.createFromTemplate(
                            this.plugin.settings.thoughtTemplate,
                            this.plugin.settings.thoughtsFolder,
                            name,
                            { name }
                        );
                    } else {
                        const path = `${this.plugin.settings.thoughtsFolder}/${name}.md`;
                        await this.app.vault.create(path, `# ${name}`);
                    }
                    break;
            }
        } catch (err) {
            new Notice("Failed to create item");
        }
        this.close();
    }

    onClose() {
        this.projectSuggest?.destroy();
        this.contentEl.empty();
    }
}
