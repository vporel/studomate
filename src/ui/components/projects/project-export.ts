import { serializeProjectToFile } from "@/persistence/project-file";
import Project from "@/schemas/project/project.schema";
import { downloadFile } from "@/ui/lib/download";

/**
 * Export a project in a JSON format
 * @param project
 * @param fileName
 */
export const exportProject = (project: Project, fileName: string) => {
	downloadFile(
		serializeProjectToFile(project),
		`${fileName}.json`,
		"application/json",
	);
};
