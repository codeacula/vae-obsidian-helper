export interface PluginSettings {
	peopleFolder: string;
	personTemplate: string;
	projectFolder: string;
	projectTemplate: string;
	thoughtsFolder: string;
	thoughtTemplate: string;
	taskTemplate: string;
	todoTemplate: string;
	todoFolder: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	peopleFolder: "/My Knowledge/People",
	personTemplate: "/Vae/System/Templates/People Template.md",
	projectFolder: "/My Projects",
	projectTemplate: "/Vae/System/Templates/Tasks/Project Template.md",
	thoughtsFolder: "/My Consciousness/Thoughts",
	thoughtTemplate: "/Vae/System/Templates/Thought Template.md",
	taskTemplate: "/Vae/System/Templates/Tasks/Task Template.md",
	todoTemplate: "/Vae/System/Templates/To Do Template.md",
	todoFolder: "/My Core/Tasks",
};
