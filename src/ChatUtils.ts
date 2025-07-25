import { App, TFile, TFolder } from "obsidian";
import { TemplaterHelper } from "./TemplaterHelper";
import { FileHelper } from "./FileHelper";

export async function listMarkdownFiles(app: App, folderPath: string): Promise<TFile[]> {
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) return [];
    return folder.children.filter((c) => c instanceof TFile && c.extension === "md") as TFile[];
}

export async function readPersonalityDescription(app: App, file: TFile): Promise<string> {
    const cache = app.metadataCache.getFileCache(file);
    if (cache?.frontmatter && typeof cache.frontmatter["description"] === "string") {
        return cache.frontmatter["description"] as string;
    }
    const content = await app.vault.read(file);
    const match = content.match(/^#\s*(.*)$/m);
    return match ? match[1] : file.basename;
}

export async function saveTranscript(
    app: App,
    messages: { role: string; content: string }[],
    personality: string,
    promptName: string
): Promise<TFile> {
    const vault = app.vault;
    const folderPath = "Conversations";
    await FileHelper.createFolderIfNotExists(folderPath, vault);
    const timestamp = window.moment().format("YYYY-MM-DD_HH-mm-ss");
    let filePath = `${folderPath}/${timestamp}_${personality}.md`;
    filePath = await FileHelper.getUniqueFilePath(vault, filePath);

    const promptLabel = promptName || "(none)";
    let md = `# Chat with ${personality} – ${timestamp}\n\n`;
    md += `**Extra Prompt:** ${promptLabel}\n---\n\n## Conversation\n`;
    messages
        .filter((m) => m.role !== "system")
        .forEach((m) => {
            md += `- **${m.role === "user" ? "User" : personality}:** ${m.content}\n`;
        });

    const templater = new TemplaterHelper(app);
    if (templater.isAvailable) {
        return vault.create(filePath, md);
    }
    return vault.create(filePath, md);
}
