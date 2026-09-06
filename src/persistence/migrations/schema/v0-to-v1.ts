import { createRandomId } from "@/ids";
import { ProjectMigration, UNVERSIONED } from "./migration";

/**
 * Ajoute un programme Main si `programs` n'en contient pas déjà un — un projet en porte
 * toujours exactement un (voir `Project.createMain`). Le Main créé est vide.
 */
function ensureMain(
	programs: Record<string, unknown>,
): Record<string, unknown> {
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
			sections: [
				{
					id: createRandomId(),
					title: "",
					description: "",
					elements: [],
					connections: [],
				},
			],
		},
	};
}

/** Noms des collections d'éléments d'un programme GRAFCET, tels que persistés. */
const GRAFCET_ELEMENT_COLLECTIONS = [
	"steps",
	"actions",
	"transitions",
	"stepsReferralsSources",
	"stepsReferralsTargets",
	"junctionsAndStarts",
	"junctionsAndEnds",
	"junctionsOrStarts",
	"junctionsOrEnds",
	"comments",
];

/**
 * Indexe une liste d'éléments (portant chacun un `id`) par cet `id`. Les éléments sans `id`
 * exploitable sont écartés — un projet plausible n'en a pas.
 */
function keyById(items: unknown): Record<string, unknown> {
	if (!Array.isArray(items)) {
		return items && typeof items === "object"
			? (items as Record<string, unknown>)
			: {};
	}
	const record: Record<string, unknown> = {};
	for (const item of items) {
		if (
			item &&
			typeof item === "object" &&
			typeof (item as Record<string, unknown>).id === "string"
		) {
			record[(item as Record<string, unknown>).id as string] = item;
		}
	}
	return record;
}

/**
 * Extrait `width`/`height` de `data` vers un champ `size` séparé, pour ne pas mélanger
 * dimensions de vue et contenu métier (voir `Element`), puis indexe chaque collection
 * d'éléments par id (voir le commentaire de classe de `Grafcet`). `connections` reste un
 * tableau.
 */
function migrateElementsSize(
	program: Record<string, unknown>,
): Record<string, unknown> {
	if (program.type !== "grafcet") return program;
	const migrated = { ...program };
	for (const collection of GRAFCET_ELEMENT_COLLECTIONS) {
		const elements = migrated[collection];
		if (!Array.isArray(elements)) continue;
		migrated[collection] = keyById(
			elements.map((element) => {
				if (!element || typeof element !== "object") return element;
				const { data, ...restOfElement } = element as Record<string, unknown>;
				if (!data || typeof data !== "object") return element;
				const { width, height, ...restOfData } = data as Record<
					string,
					unknown
				>;
				if (typeof width !== "number" || typeof height !== "number")
					return element;
				return { ...restOfElement, data: restOfData, size: { width, height } };
			}),
		);
	}
	return migrated;
}

/**
 * `connection.data.points` ne stocke plus que les coudes intermédiaires du tracé : les
 * extrémités (premier et dernier point), autrefois persistées et souvent obsolètes, sont
 * désormais dérivées des handles au rendu. On retire donc le premier et le dernier point de
 * chaque tracé ; un tracé de moins de deux points (jamais personnalisé, ou abîmé par un
 * ancien bug) devient vide.
 */
function stripConnectionsEndpoints(
	program: Record<string, unknown>,
): Record<string, unknown> {
	if (program.type !== "grafcet" || !Array.isArray(program.connections))
		return program;
	return {
		...program,
		connections: program.connections.map((connection) => {
			if (!connection || typeof connection !== "object") return connection;
			const { data, ...restOfConnection } = connection as Record<
				string,
				unknown
			>;
			if (!data || typeof data !== "object") return connection;
			const points = (data as Record<string, unknown>).points;
			if (!Array.isArray(points)) return connection;
			return {
				...restOfConnection,
				data: {
					...(data as Record<string, unknown>),
					points: points.length >= 2 ? points.slice(1, -1) : [],
				},
			};
		}),
	};
}

/** Enchaîne les transformations d'un programme GRAFCET de la v0. */
function migrateGrafcetProgram(
	program: Record<string, unknown>,
): Record<string, unknown> {
	return stripConnectionsEndpoints(migrateElementsSize(program));
}

/**
 * Renomme le champ `grafcets` en `programs` et tague chaque entrée avec sa notation.
 * Garantit aussi la présence d'un programme Main (voir `ensureMain`), déplace les dimensions des
 * éléments GRAFCET de `data` vers `size` puis indexe chaque collection d'éléments GRAFCET par id
 * (voir `migrateElementsSize` / `keyById`), et retire les extrémités des tracés de connexion
 * GRAFCET (voir `stripConnectionsEndpoints`). La v0 n'ayant pas d'HMI, `hmiPages` est simplement
 * posé vide.
 */
const v0ToV1: ProjectMigration = {
	from: UNVERSIONED,
	description:
		"Rename `grafcets` to `programs`, tag each program with its notation, guarantee a Main program, move GRAFCET elements dimensions from `data` to `size`, index GRAFCET element collections by id, set an empty `hmiPages`, and strip stored endpoints from GRAFCET connection paths",
	migrate: (project) => {
		const { grafcets, ...rest } = project;
		if (!grafcets || typeof grafcets !== "object") {
			const programs = ensureMain(
				(project.programs as Record<string, unknown>) ?? {},
			);
			for (const id in programs) {
				const program = programs[id];
				if (program && typeof program === "object")
					programs[id] = migrateGrafcetProgram(
						program as Record<string, unknown>,
					);
			}
			return {
				...rest,
				programs,
				hmiPages: {},
				schemaVersion: 1,
			};
		}
		const programs: Record<string, unknown> = {};
		const grafcetsRecord = grafcets as Record<string, unknown>;
		for (const id in grafcetsRecord) {
			const grafcet = grafcetsRecord[id];
			if (!grafcet || typeof grafcet !== "object") continue;
			programs[id] = migrateGrafcetProgram({ ...grafcet, type: "grafcet" });
		}
		return {
			...rest,
			programs: ensureMain(programs),
			hmiPages: {},
			schemaVersion: 1,
		};
	},
};

export default v0ToV1;
