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
 * `width`/`height` vivaient dans `data`, au même niveau que les champs métier de l'élément
 * (numéro d'étape, expression...). Ils en sont extraits vers un champ `size` séparé, à côté de
 * `data`, pour ne plus mélanger dimensions de vue et contenu métier (voir `Element`).
 */
function migrateElementsSize(program: Record<string, unknown>): Record<string, unknown> {
	if (program.type !== "grafcet") return program;
	const migrated = { ...program };
	for (const collection of GRAFCET_ELEMENT_COLLECTIONS) {
		const elements = migrated[collection];
		if (!Array.isArray(elements)) continue;
		migrated[collection] = elements.map((element) => {
			if (!element || typeof element !== "object") return element;
			const { data, ...restOfElement } = element as Record<string, unknown>;
			if (!data || typeof data !== "object") return element;
			const { width, height, ...restOfData } = data as Record<string, unknown>;
			if (typeof width !== "number" || typeof height !== "number") return element;
			return { ...restOfElement, data: restOfData, size: { width, height } };
		});
	}
	return migrated;
}

/**
 * Un champ `{ value, variableMnemonic }` (voir l'ancien `HmiBindableValue`) redevient sa valeur
 * brute — `variableMnemonic` n'a jamais été exposé dans le panel de propriétés, aucun projet
 * existant ne peut donc l'avoir renseigné.
 */
function unwrapBindableValue(field: unknown): unknown {
	if (!field || typeof field !== "object" || !("value" in (field as Record<string, unknown>))) return field;
	return (field as Record<string, unknown>).value;
}

/**
 * `fill`/`stroke` (rectangle, ellipse), `text` (text) et `orientation` (gauge) étaient enveloppés
 * dans un `HmiBindableValue` (voir `unwrapBindableValue`) — supprimé au profit d'un bloc
 * "Animations" séparé (voir `HmiWidgetAnimations`).
 */
function migrateHmiWidget(widget: unknown): unknown {
	if (!widget || typeof widget !== "object") return widget;
	const w = widget as Record<string, unknown>;
	const data = w.data;
	if (!data || typeof data !== "object") return widget;
	const migratedData = { ...(data as Record<string, unknown>) };
	if (w.type === "rectangle" || w.type === "ellipse") {
		const style = migratedData.style;
		if (style && typeof style === "object") {
			migratedData.style = {
				...(style as Record<string, unknown>),
				fill: unwrapBindableValue((style as Record<string, unknown>).fill),
				stroke: unwrapBindableValue((style as Record<string, unknown>).stroke),
			};
		}
	} else if (w.type === "text") {
		migratedData.text = unwrapBindableValue(migratedData.text);
	} else if (w.type === "gauge") {
		const style = migratedData.style;
		if (style && typeof style === "object" && "orientation" in (style as Record<string, unknown>)) {
			migratedData.style = {
				...(style as Record<string, unknown>),
				orientation: unwrapBindableValue((style as Record<string, unknown>).orientation),
			};
		}
	}
	return { ...w, data: migratedData };
}

function migrateHmiPages(hmiPages: Record<string, unknown>): Record<string, unknown> {
	const migrated: Record<string, unknown> = {};
	for (const id in hmiPages) {
		const page = hmiPages[id];
		if (!page || typeof page !== "object") {
			migrated[id] = page;
			continue;
		}
		const p = page as Record<string, unknown>;
		migrated[id] = {
			...p,
			widgets: Array.isArray(p.widgets) ? p.widgets.map(migrateHmiWidget) : p.widgets,
		};
	}
	return migrated;
}

/**
 * Un projet rangeait ses programmes dans un champ `grafcets`, ce qui faisait du GRAFCET la
 * seule notation exprimable. Le champ devient `programs` et chaque entrée porte sa notation.
 * Garantit aussi la présence d'un programme Main (voir `ensureMain`), déplace les dimensions des
 * éléments GRAFCET de `data` vers `size` (voir `migrateElementsSize`), et déballe les champs de
 * widget HMI qui portaient un `HmiBindableValue` (voir `migrateHmiWidget`).
 */
const v0ToV1: ProjectMigration = {
	from: UNVERSIONED,
	description:
		"Rename `grafcets` to `programs`, tag each program with its notation, guarantee a Main program, move GRAFCET elements dimensions from `data` to `size`, and unwrap HMI widget bindable-value fields",
	migrate: (project) => {
		const { grafcets, ...rest } = project;
		if (!grafcets || typeof grafcets !== "object") {
			const programs = ensureMain(project.programs ?? {});
			for (const id in programs) {
				const program = programs[id];
				if (program && typeof program === "object") programs[id] = migrateElementsSize(program as Record<string, unknown>);
			}
			return {
				...rest,
				programs,
				hmiPages: migrateHmiPages((project.hmiPages as Record<string, unknown>) ?? {}),
				schemaVersion: 1,
			};
		}
		const programs: Record<string, unknown> = {};
		for (const id in grafcets) {
			const grafcet = grafcets[id];
			if (!grafcet || typeof grafcet !== "object") continue;
			programs[id] = migrateElementsSize({ ...grafcet, type: "grafcet" });
		}
		return { ...rest, programs: ensureMain(programs), hmiPages: {}, schemaVersion: 1 };
	},
};

export default v0ToV1;
