import Project from "@/schemas/project/project.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Program, { PROGRAM_TYPES } from "@/schemas/program/program.schema";

export type ProjectContent = "grafcet" | "ladder" | "hmi" | "scene3d";

/** Every project carries a Main ladder: it only counts once it holds something. */
function counts(program: Program): boolean {
	if (program.type !== "ladder") return true;
	const ladder = program as Ladder;
	return !ladder.isMain() || !ladder.isEmpty();
}

/** What a project is made of, in a fixed order: notations used, then HMI pages, then 3D scene. */
export function projectContents(project: Project): ProjectContent[] {
	const programs = Object.values(project.programs).filter(counts);
	return [
		...PROGRAM_TYPES.filter((type) =>
			programs.some((program) => program.type === type),
		),
		...(Object.keys(project.hmiPages).length > 0 ? (["hmi"] as const) : []),
		...(project.scene3d ? (["scene3d"] as const) : []),
	];
}
