import { App, TFolder } from "obsidian";

// Interface for suggestion items
interface SuggestionItem {
	path: string;
	name: string;
	type: "file" | "folder";
}

// Inline suggestion component for text inputs
export class InlineSuggest {
	private app: App;
	private inputEl: HTMLInputElement;
	private suggestionsContainer: HTMLElement;
	private suggestions: SuggestionItem[] = [];
	private activeSuggestion = -1;
	private callback: (selected: string) => void;
	private getSuggestions: (query: string) => SuggestionItem[];

        private onScrollRef: () => void;
        private onResizeRef: () => void;

        constructor(
                app: App,
                inputEl: HTMLInputElement,
                getSuggestions: (query: string) => SuggestionItem[],
                callback: (selected: string) => void
        ) {
                this.app = app;
                this.inputEl = inputEl;
                this.getSuggestions = getSuggestions;
                this.callback = callback;

		this.setupSuggestionsContainer();
		this.attachEventListeners();
	}

	private setupSuggestionsContainer() {
		// Create suggestions container
		this.suggestionsContainer = createDiv({
			cls: "vae-suggestions",
		});

		// Position it as fixed overlay
		this.suggestionsContainer.style.position = "fixed";
		this.suggestionsContainer.style.zIndex = "1000";
		this.suggestionsContainer.style.display = "none";

		// Append to document body for proper positioning
		document.body.appendChild(this.suggestionsContainer);
	}

	private attachEventListeners() {
		this.inputEl.addEventListener("input", this.onInput.bind(this));
		this.inputEl.addEventListener("keydown", this.onKeyDown.bind(this));
		this.inputEl.addEventListener("blur", this.onBlur.bind(this));
		this.inputEl.addEventListener("focus", this.onFocus.bind(this));

		// Reposition on scroll
                this.onScrollRef = this.onScroll.bind(this);
                this.onResizeRef = this.onResize.bind(this);
                window.addEventListener("scroll", this.onScrollRef, true);
                window.addEventListener("resize", this.onResizeRef);
        }

	private onScroll() {
		if (this.isSuggestionsVisible()) {
			this.positionSuggestions();
		}
	}

	private onResize() {
		if (this.isSuggestionsVisible()) {
			this.positionSuggestions();
		}
	}

	private onInput() {
		const query = this.inputEl.value.trim();
		if (query.length === 0) {
			this.hideSuggestions();
			return;
		}

		this.suggestions = this.getSuggestions(query);
		this.activeSuggestion = -1;
		this.renderSuggestions();
		this.showSuggestions();
	}

	private onKeyDown(event: KeyboardEvent) {
		if (!this.isSuggestionsVisible()) return;

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				this.activeSuggestion = Math.min(
					this.activeSuggestion + 1,
					this.suggestions.length - 1
				);
				this.updateActiveSuggestion();
				break;
			case "ArrowUp":
				event.preventDefault();
				this.activeSuggestion = Math.max(this.activeSuggestion - 1, -1);
				this.updateActiveSuggestion();
				break;
			case "Enter":
				event.preventDefault();
				if (this.activeSuggestion >= 0) {
					this.selectSuggestion(
						this.suggestions[this.activeSuggestion]
					);
				}
				break;
			case "Escape":
				this.hideSuggestions();
				break;
		}
	}

	private onFocus() {
		if (
			this.inputEl.value.trim().length > 0 &&
			this.suggestions.length > 0
		) {
			this.showSuggestions();
		}
	}

	private onBlur() {
		// Delay hiding to allow for click events on suggestions
		setTimeout(() => this.hideSuggestions(), 150);
	}

	private renderSuggestions() {
		this.suggestionsContainer.empty();

		this.suggestions.forEach((suggestion, index) => {
			const suggestionEl = this.suggestionsContainer.createDiv({
				cls: "vae-suggestion-item",
			});

			// Create title
			suggestionEl.createDiv({
				cls: "vae-suggestion-title",
				text: suggestion.name,
			});

			// Create path if different from name
			if (suggestion.path !== suggestion.name) {
				suggestionEl.createDiv({
					cls: "vae-suggestion-path",
					text: suggestion.path,
				});
			}

			// Add click handler
			suggestionEl.addEventListener("click", () => {
				this.selectSuggestion(suggestion);
			});

			// Add hover handler
			suggestionEl.addEventListener("mouseenter", () => {
				this.activeSuggestion = index;
				this.updateActiveSuggestion();
			});
		});
	}

	private updateActiveSuggestion() {
		const suggestionItems = this.suggestionsContainer.querySelectorAll(
			".vae-suggestion-item"
		);

		suggestionItems.forEach((item, index) => {
			if (index === this.activeSuggestion) {
				item.classList.add("vae-suggestion-active");
			} else {
				item.classList.remove("vae-suggestion-active");
			}
		});
	}

	private selectSuggestion(suggestion: SuggestionItem) {
		this.inputEl.value = suggestion.path;
		this.callback(suggestion.path);
		this.hideSuggestions();

		// Trigger input event to update settings
		this.inputEl.dispatchEvent(new Event("input"));
	}

	private showSuggestions() {
		if (this.suggestions.length === 0) return;

		this.suggestionsContainer.style.display = "block";
		this.suggestionsContainer.style.visibility = "hidden"; // Make visible but transparent for measurements

		// Use requestAnimationFrame to ensure the container is rendered before positioning
		requestAnimationFrame(() => {
			this.positionSuggestions();
			this.suggestionsContainer.style.visibility = "visible";
		});
	}

	private hideSuggestions() {
		this.suggestionsContainer.style.display = "none";
		this.activeSuggestion = -1;
	}

	private isSuggestionsVisible(): boolean {
		return this.suggestionsContainer.style.display !== "none";
	}

	private positionSuggestions() {
		const inputRect = this.inputEl.getBoundingClientRect();
		const suggestionHeight = this.suggestionsContainer.offsetHeight;

		// Position directly above the input field with a small gap
		this.suggestionsContainer.style.position = "fixed";
		this.suggestionsContainer.style.left = `${inputRect.left}px`;
		this.suggestionsContainer.style.top = `${
			inputRect.top - suggestionHeight - 4
		}px`;
		this.suggestionsContainer.style.width = `${inputRect.width}px`;

		// If suggestions would go above viewport, position below input instead
		if (inputRect.top - suggestionHeight - 4 < 0) {
			this.suggestionsContainer.style.top = `${inputRect.bottom + 4}px`;
		}
	}

	destroy() {
		// Remove event listeners
                window.removeEventListener("scroll", this.onScrollRef, true);
                window.removeEventListener("resize", this.onResizeRef);

		// Remove from DOM
		this.suggestionsContainer.remove();
	}
}

// Helper functions for getting suggestions
export function getFolderSuggestions(
	app: App,
	query: string
): SuggestionItem[] {
	const folders: SuggestionItem[] = [];

	// Add root folder option if it matches
        if (
                "/ (Root)".toLowerCase().includes(query.toLowerCase()) ||
                query === "/"
        ) {
		folders.push({
			path: "/",
			name: "/ (Root)",
			type: "folder",
		});
	}

	// Get all folders from vault
	const allFiles = app.vault.getAllLoadedFiles();
	allFiles
		.filter((file): file is TFolder => file instanceof TFolder)
		.forEach((folder) => {
			const name = folder.name || folder.path;
                        if (
                                name.toLowerCase().includes(query.toLowerCase()) ||
                                folder.path.toLowerCase().includes(query.toLowerCase())
                        ) {
				folders.push({
					path: folder.path,
					name: name,
					type: "folder",
				});
			}
		});

	return folders.slice(0, 10); // Limit to 10 suggestions
}

export function getFileSuggestions(
	app: App,
	query: string,
	extension?: string
): SuggestionItem[] {
	let files = app.vault.getFiles();

	// Filter by extension if specified
	if (extension && extension.length > 0) {
		files = files.filter((file) => file.path.endsWith(extension));
	}

	const suggestions = files
                .filter((file) => {
                        return (
                                file.basename.toLowerCase().includes(query.toLowerCase()) ||
                                file.path.toLowerCase().includes(query.toLowerCase())
                        );
                })
		.map(
			(file): SuggestionItem => ({
				path: file.path,
				name: file.basename,
				type: "file",
			})
		)
		.slice(0, 10); // Limit to 10 suggestions

	return suggestions;
}

export function getProjectSuggestions(
	app: App,
	query: string,
	projectFolder: string
): SuggestionItem[] {
	const projectsFolder = app.vault.getAbstractFileByPath(projectFolder);

	if (!(projectsFolder instanceof TFolder)) {
		return [];
	}

	return projectsFolder.children
		.filter((child): child is TFolder => child instanceof TFolder)
                .filter((folder) => {
                        return folder.name.toLowerCase().includes(query.toLowerCase());
                })
		.map(
			(folder): SuggestionItem => ({
				path: folder.name, // Return just the name for project selection
				name: folder.name,
				type: "folder",
			})
		)
		.slice(0, 10); // Limit to 10 suggestions
}
