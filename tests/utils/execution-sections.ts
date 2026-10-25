import type Ladder from "@/schemas/ladder/ladder.schema";
import type Section from "@/schemas/ladder/section.schema";
import type Project from "@/schemas/project/project.schema";

/** Ladder program called by a section of the Main, `undefined` for any other section. */
function calledProgram(project: Project, section: Section): Ladder | undefined {
	for (const element of section.elements) {
		if (element.type !== "block" || element.data.blockType !== "user-program")
			continue;
		return project.ladders[element.data.params.programId];
	}
	return undefined;
}

/** Programs the Main calls, in call order. */
export function calledPrograms(project: Project): Ladder[] {
	return project.main.sections.flatMap((section) => {
		const program = calledProgram(project, section);
		return program ? [program] : [];
	});
}

/** Sections in execution order: each call in the Main is replaced by the sections of the called program. */
export function executionSections(project: Project): Section[] {
	return project.main.sections.flatMap((section) => {
		const program = calledProgram(project, section);
		return program ? program.sections : [section];
	});
}
