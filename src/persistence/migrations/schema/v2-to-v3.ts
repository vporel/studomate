import { ProjectMigration } from "./migration";

/** Names of the `CTU` counter blocks across all Ladder programs. */
function collectCtuBlockNames(programs: Record<string, unknown>): string[] {
	const names: string[] = [];
	for (const program of Object.values(programs)) {
		if (!program || typeof program !== "object") continue;
		const p = program as Record<string, unknown>;
		if (p.type !== "ladder" || !Array.isArray(p.sections)) continue;
		for (const section of p.sections) {
			const elements = (section as Record<string, unknown> | null)?.elements;
			if (!Array.isArray(elements)) continue;
			for (const element of elements) {
				const data = (element as Record<string, unknown> | null)?.data as
					| Record<string, unknown>
					| undefined;
				const params = data?.params as Record<string, unknown> | undefined;
				if (
					data?.blockType === "counter" &&
					params?.counterType === "CTU" &&
					typeof params.name === "string"
				) {
					names.push(params.name);
				}
			}
		}
	}
	return names;
}

/**
 * Replaces every string strictly equal to a key of `renames`, at any depth. A block variable
 * (`Name.PORT`) is only ever referenced by a field holding its bare mnemonic (contact, coil,
 * block pin, widget): the expression language does not accept dotted names.
 */
function renameExactStrings(
	value: unknown,
	renames: Map<string, string>,
): unknown {
	if (typeof value === "string") return renames.get(value) ?? value;
	if (Array.isArray(value))
		return value.map((item) => renameExactStrings(item, renames));
	if (value && typeof value === "object") {
		const result: Record<string, unknown> = {};
		for (const key in value as Record<string, unknown>) {
			result[key] = renameExactStrings(
				(value as Record<string, unknown>)[key],
				renames,
			);
		}
		return result;
	}
	return value;
}

/**
 * Push-buttons: the `momentary` behavior (also the meaning of an absent behavior) becomes
 * `momentary-no`. Toggle-switches get the explicit `contact: "no"`.
 */
function migrateHmiSwitchingWidgets(hmiPages: unknown): unknown {
	if (!hmiPages || typeof hmiPages !== "object") return hmiPages;
	const pages: Record<string, unknown> = {};
	for (const [pageId, page] of Object.entries(hmiPages)) {
		const widgets = (page as Record<string, unknown> | null)?.widgets;
		if (!widgets || typeof widgets !== "object") {
			pages[pageId] = page;
			continue;
		}
		const migratedWidgets = Array.isArray(widgets)
			? widgets.map(migrateHmiWidget)
			: Object.fromEntries(
					Object.entries(widgets).map(([id, w]) => [id, migrateHmiWidget(w)]),
				);
		pages[pageId] = { ...(page as object), widgets: migratedWidgets };
	}
	return pages;
}

function migrateHmiWidget(widget: unknown): unknown {
	if (!widget || typeof widget !== "object") return widget;
	const w = widget as Record<string, unknown>;
	const data = (w.data ?? {}) as Record<string, unknown>;
	if (w.type === "push-button") {
		if (data.behavior !== undefined && data.behavior !== "momentary")
			return widget;
		return { ...w, data: { ...data, behavior: "momentary-no" } };
	}
	if (w.type === "toggle-switch") {
		return { ...w, data: { ...data, contact: "no" } };
	}
	return widget;
}

/** The `LONG` variable type becomes `DINT` (IEC 61131-3). */
function migrateLongVariables(variables: unknown): unknown {
	if (!Array.isArray(variables)) return variables;
	return variables.map((variable) =>
		(variable as Record<string, unknown> | null)?.type === "LONG"
			? { ...(variable as object), type: "DINT" }
			: variable,
	);
}

/**
 * - The counting port of a `CTU` is named `CU` (IEC 61131-3): references to `Name.IN` become
 *   `Name.CU`. `CTD` already used `CD`.
 * - HMI push-buttons and toggle-switches carry an explicit NO/NC contact.
 * - The `LONG` variable type is replaced by `DINT`.
 */
const v2ToV3: ProjectMigration = {
	from: 2,
	description:
		"Rename CTU counting port references from `.IN` to `.CU`; explicit NO/NC contact on HMI push-buttons and toggle-switches; `LONG` variable type replaced by `DINT`",
	migrate: (project) => {
		const programs = project.programs;
		const names =
			programs && typeof programs === "object"
				? collectCtuBlockNames(programs as Record<string, unknown>)
				: [];
		const renames = new Map(names.map((name) => [`${name}.IN`, `${name}.CU`]));
		const renamed =
			renames.size > 0
				? (renameExactStrings(project, renames) as Record<string, unknown>)
				: project;
		const hmiPages = migrateHmiSwitchingWidgets(renamed.hmiPages);
		const variables = migrateLongVariables(renamed.variables);
		return {
			...renamed,
			...(hmiPages !== undefined ? { hmiPages } : {}),
			...(variables !== undefined ? { variables } : {}),
			schemaVersion: 3,
		};
	},
};

export default v2ToV3;
