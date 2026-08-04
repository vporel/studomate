import { ProjectMigration, UNVERSIONED } from "./migration";

/**
 * Un projet rangeait ses programmes dans un champ `grafcets`, ce qui faisait du GRAFCET la
 * seule notation exprimable. Le champ devient `programs` et chaque entrée porte sa notation.
 */
const v0ToV1: ProjectMigration = {
	from: UNVERSIONED,
	description: "Rename `grafcets` to `programs` and tag each program with its notation",
	migrate: (project) => {
		const { grafcets, ...rest } = project;
		if (!grafcets || typeof grafcets !== "object") {
			return { ...rest, programs: project.programs ?? {}, schemaVersion: 1 };
		}
		const programs: Record<string, unknown> = {};
		for (const id in grafcets) {
			const grafcet = grafcets[id];
			if (!grafcet || typeof grafcet !== "object") continue;
			programs[id] = { ...grafcet, type: "grafcet" };
		}
		return { ...rest, programs, schemaVersion: 1 };
	},
};

export default v0ToV1;
