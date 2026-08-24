import { createRandomId } from "@/ids";
import { ProjectMigration, UNVERSIONED } from "./migration";

/**
 * Ajoute un programme Main si `programs` n'en contient pas déjà un — un projet en porte
 * toujours exactement un (voir `Project.createMain`). Le module ladder n'ayant pas encore été
 * déployé, aucun projet existant n'a de ladder à y référencer : le Main créé est vide.
 */
function ensureMain(programs: Record<string, unknown>): Record<string, unknown> {
	const hasMain = Object.values(programs).some((program) => {
		if (!program || typeof program !== "object") return false;
		const p = program as Record<string, unknown>;
		return p.type === "ladder" && p.role === "main";
	});
	if (hasMain) return programs;
	const mainId = createRandomId();
	return {
		...programs,
		[mainId]: {
			id: mainId,
			name: "Main",
			type: "ladder",
			role: "main",
			sections: [{ id: createRandomId(), title: "", description: "", elements: [], connections: [] }],
		},
	};
}

/**
 * Un projet rangeait ses programmes dans un champ `grafcets`, ce qui faisait du GRAFCET la
 * seule notation exprimable. Le champ devient `programs` et chaque entrée porte sa notation.
 * Garantit aussi la présence d'un programme Main (voir `ensureMain`).
 */
const v0ToV1: ProjectMigration = {
	from: UNVERSIONED,
	description:
		"Rename `grafcets` to `programs`, tag each program with its notation, and guarantee a Main program",
	migrate: (project) => {
		const { grafcets, ...rest } = project;
		if (!grafcets || typeof grafcets !== "object") {
			return { ...rest, programs: ensureMain(project.programs ?? {}), schemaVersion: 1 };
		}
		const programs: Record<string, unknown> = {};
		for (const id in grafcets) {
			const grafcet = grafcets[id];
			if (!grafcet || typeof grafcet !== "object") continue;
			programs[id] = { ...grafcet, type: "grafcet" };
		}
		return { ...rest, programs: ensureMain(programs), schemaVersion: 1 };
	},
};

export default v0ToV1;
