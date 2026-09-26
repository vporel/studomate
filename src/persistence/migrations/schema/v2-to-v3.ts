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
 * The counting port of a `CTU` is named `CU` (IEC 61131-3): references to `Name.IN` become
 * `Name.CU`. `CTD` already used `CD`.
 */
const v2ToV3: ProjectMigration = {
	from: 2,
	description: "Rename CTU counting port references from `.IN` to `.CU`",
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
		return { ...renamed, schemaVersion: 3 };
	},
};

export default v2ToV3;
