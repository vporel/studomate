import Project from "@/schemas/project/project.schema";

/**
 * Export a project in a JSON format
 * @param project
 * @param fileName
 */
export const exportProject = (project: Project, fileName: string) => {
	const projectData = JSON.stringify(project, null, 2);
	const blob = new Blob([projectData], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${fileName}.json`;
	a.click();
	URL.revokeObjectURL(url);
};
