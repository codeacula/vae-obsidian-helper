import { TFile, Vault } from "obsidian";

export async function moveToArchiveFolder(
	vault: Vault,
	file: TFile,
	date: Date
): Promise<string> {
	// Determine parent folder of the file
	const parentFolder = file.parent?.path || "";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const newFolder = parentFolder
		? `${parentFolder}/${year}/${month}`
		: `${year}/${month}`;
	const newPath = `${newFolder}/${file.basename}.md`;

	try {
		await vault.createFolder(newFolder);
	} catch {
		/* empty */
	}

	await vault.rename(file, newPath);
	return newPath;
}
