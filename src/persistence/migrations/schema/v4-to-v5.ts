import { ProjectMigration } from "./migration";

const CONVERTIBLE_TYPES = ["INT", "DINT", "WORD", "DWORD", "REAL"];
const BIT_STRING_TYPES = ["WORD", "DWORD"];

function isSupportedConversion(source: string, target: string): boolean {
	if (source === target) return false;
	return !(
		(source === "REAL" && BIT_STRING_TYPES.includes(target)) ||
		(target === "REAL" && BIT_STRING_TYPES.includes(source))
	);
}

function collectVariableTypes(variables: unknown): Map<string, string> {
	const types = new Map<string, string>();
	if (!Array.isArray(variables)) return types;
	for (const variable of variables) {
		const { mnemonic, type } = (variable ?? {}) as Record<string, unknown>;
		if (typeof mnemonic === "string" && typeof type === "string")
			types.set(mnemonic, type);
	}
	return types;
}

function migrateConvertParams(
	params: Record<string, unknown>,
	variableTypes: Map<string, string>,
): Record<string, unknown> {
	const declared = (pin: unknown, fallback: string): string => {
		const type =
			typeof pin === "string" ? variableTypes.get(pin.trim()) : undefined;
		return type && CONVERTIBLE_TYPES.includes(type) ? type : fallback;
	};
	const inType = declared(params.in, "INT");
	let outType = declared(params.out, "REAL");
	if (!isSupportedConversion(inType, outType))
		outType = CONVERTIBLE_TYPES.find((t) => isSupportedConversion(inType, t))!;
	return { ...params, inType, outType };
}

function migrateProgram(
	program: unknown,
	variableTypes: Map<string, string>,
): unknown {
	if (!program || typeof program !== "object") return program;
	const p = program as Record<string, unknown>;
	if (p.type !== "ladder" || !Array.isArray(p.sections)) return program;
	const sections = p.sections.map((section) => {
		const elements = (section as Record<string, unknown> | null)?.elements;
		if (!Array.isArray(elements)) return section;
		return {
			...(section as object),
			elements: elements.map((element) => {
				const data = (element as Record<string, unknown> | null)?.data as
					Record<string, unknown> | undefined;
				if (data?.blockType !== "convert") return element;
				return {
					...(element as object),
					data: {
						...data,
						params: migrateConvertParams(
							(data.params ?? {}) as Record<string, unknown>,
							variableTypes,
						),
					},
				};
			}),
		};
	});
	return { ...p, sections };
}

/**
 * Ladder `convert` blocks carry the source and target types of their conversion (`inType`,
 * `outType`): they are taken from the declared types of the block's `IN` and `OUT` variables,
 * falling back to `INT` / `REAL` for an empty or non-convertible pin, and to the first
 * supported target when the pair is not a supported conversion.
 */
const v4ToV5: ProjectMigration = {
	from: 4,
	description:
		"Add `inType` and `outType` to Ladder convert blocks, from the declared types of their variables",
	migrate: (project) => {
		const programs = project.programs;
		if (!programs || typeof programs !== "object")
			return { ...project, schemaVersion: 5 };
		const variableTypes = collectVariableTypes(project.variables);
		const migrated = Object.fromEntries(
			Object.entries(programs).map(([id, program]) => [
				id,
				migrateProgram(program, variableTypes),
			]),
		);
		return { ...project, programs: migrated, schemaVersion: 5 };
	},
};

export default v4ToV5;
