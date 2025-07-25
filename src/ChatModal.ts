import { App, Modal, Notice, TFile, TFolder } from "obsidian";
import { listMarkdownFiles, readPersonalityDescription, saveTranscript } from "./ChatUtils";
import VaePlugin from "main";

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

/** Modal for AI chat with personality and extra prompt pickers */
export class ChatModal extends Modal {
    private plugin: VaePlugin;
    private personalityFiles: TFile[] = [];
    private promptFiles: TFile[] = [];
    private history: ChatMessage[] = [];
    private logEl!: HTMLElement;
    private inputEl!: HTMLTextAreaElement;
    private sendBtn!: HTMLButtonElement;
    private personalitySelect!: HTMLSelectElement;
    private promptSelect!: HTMLSelectElement;

    constructor(app: App, plugin: VaePlugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.addClass("vae-modal");
        this.personalityFiles = await listMarkdownFiles(this.app, this.plugin.settings.personalitiesFolder);
        this.promptFiles = await listMarkdownFiles(this.app, this.plugin.settings.promptsFolder);

        // dropdowns
        const pRow = contentEl.createDiv("vae-field-container");
        pRow.createEl("label", { text: "Personality", cls: "vae-label" });
        this.personalitySelect = pRow.createEl("select", { cls: "vae-select" });
        this.personalityFiles.forEach((f, idx) => {
            const opt = this.personalitySelect.createEl("option", {
                text: f.basename,
            });
            if (
                (this.plugin.settings.defaultPersonality &&
                    f.basename === this.plugin.settings.defaultPersonality) ||
                (!this.plugin.settings.defaultPersonality && idx === 0)
            ) {
                opt.selected = true;
            }
        });

        const promptRow = contentEl.createDiv("vae-field-container");
        promptRow.createEl("label", { text: "Extra Prompt", cls: "vae-label" });
        this.promptSelect = promptRow.createEl("select", { cls: "vae-select" });
        const blank = this.promptSelect.createEl("option", { text: "(none)" });
        if (!this.plugin.settings.defaultPrompt) blank.selected = true;
        this.promptFiles.forEach((f) => {
            const opt = this.promptSelect.createEl("option", { text: f.basename });
            if (f.basename === this.plugin.settings.defaultPrompt) opt.selected = true;
        });

        this.logEl = contentEl.createDiv({ cls: "vae-chat-log" });
        this.logEl.style.maxHeight = "300px";
        this.logEl.style.overflowY = "auto";

        this.inputEl = contentEl.createEl("textarea", { cls: "vae-input" });
        this.inputEl.rows = 3;

        this.sendBtn = contentEl.createEl("button", { text: "Send", cls: "vae-button mod-cta" });
        this.sendBtn.onclick = () => this.handleSend();
    }

    private async handleSend() {
        const text = this.inputEl.value.trim();
        if (!text) return;
        this.inputEl.value = "";
        this.appendMessage("user", text);
        // Normally we would call an AI service here
        const reply = "(AI response)";
        this.appendMessage("assistant", reply);
    }

    private appendMessage(role: "user" | "assistant", text: string) {
        this.history.push({ role, content: text });
        const line = this.logEl.createDiv();
        line.createEl("strong", { text: role === "user" ? "User:" : `${this.personalitySelect.value}:` });
        line.appendText(` ${text}`);
        this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    async onClose() {
        await this.archiveConversation();
        this.contentEl.empty();
    }

    private async archiveConversation() {
        if (this.history.length === 0) return;
        const personalityName = this.personalitySelect.value;
        const promptName = this.promptSelect.value === "(none)" ? "" : this.promptSelect.value;
        const personalityFile = this.personalityFiles.find((f) => f.basename === personalityName);
        const promptFile = this.promptFiles.find((f) => f.basename === promptName);
        const desc = personalityFile ? await readPersonalityDescription(this.app, personalityFile) : "";
        const promptContent = promptFile ? await this.app.vault.read(promptFile) : "";
        const systemMsg = desc + (promptContent ? `\n\n${promptContent}` : "");
        const messages: ChatMessage[] = [{ role: "system", content: systemMsg }, ...this.history];
        try {
            await saveTranscript(
                this.app,
                messages,
                personalityName,
                promptName
            );
        } catch (err) {
            new Notice("Failed to save transcript");
        }
    }
}
