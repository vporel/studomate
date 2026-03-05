import Project from "@/schemas/project/project.schema";

const LOCAL_STORAGE_PROJECTS_KEY = "studomate_projects_data";

export function localStorageLoadProjects(): Project[] {
	const projectsJSON = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
	if (!projectsJSON) return [];
	try {
		const projectsParsed = JSON.parse(projectsJSON);
		return projectsParsed.map((projectJSON: string) => Project.createFromJSON(projectJSON));
	} catch (e) {
		console.error("Failed to load projects from local storage:", e);
		return [];
	}
}

export function localStorageGetProject(projectId: string): Project | null {
	const projects = localStorageLoadProjects();
	const project = projects.find((p) => p.id === projectId);
	return project || null;
}

export function localStorageSaveProject(project: Project) {
	const projects = localStorageLoadProjects();
	const existingIndex = projects.findIndex((p) => p.id === project.id);
	if (existingIndex !== -1) {
		projects[existingIndex] = project;
	} else {
		projects.push(project);
	}
	const projectsJSON = JSON.stringify(projects.map((p) => JSON.stringify(p)));
	localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, projectsJSON);
}

export function localStorageDeleteProject(projectId: string) {
	const projects = localStorageLoadProjects();
	const updatedProjects = projects.filter((p) => p.id !== projectId);
	const projectsJSON = JSON.stringify(updatedProjects.map((p) => JSON.stringify(p)));
	localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, projectsJSON);
}
