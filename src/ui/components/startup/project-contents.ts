import Project from "@/schemas/project/project.schema";
import { PROGRAM_TYPES } from "@/schemas/program/program.schema";

export type ProjectContent = "grafcet" | "ladder" | "hmi" | "scene3d";

/** What a project is made of, in a fixed order: notations used, then HMI pages, then 3D scene. */
export function projectContents(project: Project): ProjectContent[] {
	const programs = Object.values(project.programs);
	return [
		...PROGRAM_TYPES.filter((type) =>
			programs.some((program) => program.type === type),
		),
		...(Object.keys(project.hmiPages).length > 0 ? (["hmi"] as const) : []),
		...(project.scene3d ? (["scene3d"] as const) : []),
	];
}
