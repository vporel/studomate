import type { VariableZone } from "@/schemas/variable/variable.schema";

interface VariablesPageEntry {
	id: string;
	zones: VariableZone[];
	/** PDF group key. */
	group: string;
	/** Table columns used when the page is exported as PDF. */
	columns: "address" | "declaredValue";
	/** Fallback title stored in the page data. */
	title: string;
	/** Key of the title in the `pages.titles` message bundle. */
	titleKey: string;
}

export const VARIABLES_PAGES = [
	{
		id: "input-variables",
		zones: ["logic-input", "analog-input"],
		group: "input",
		columns: "address",
		title: "Variables d'entrée",
		titleKey: "inputVariables",
	},
	{
		id: "output-variables",
		zones: ["logic-output", "analog-output"],
		group: "output",
		columns: "address",
		title: "Variables de sortie",
		titleKey: "outputVariables",
	},
	{
		id: "memory-variables",
		zones: ["memory"],
		group: "memory",
		columns: "address",
		title: "Variables de mémoire",
		titleKey: "memoryVariables",
	},
	{
		id: "constant-variables",
		zones: ["constant"],
		group: "constant",
		columns: "declaredValue",
		title: "Constantes",
		titleKey: "constantVariables",
	},
] as const satisfies readonly VariablesPageEntry[];

export type VariablesPageDefinition = (typeof VARIABLES_PAGES)[number];
export type VariablesPageId = VariablesPageDefinition["id"];
export type VariableGroupKey = VariablesPageDefinition["group"];

export const VARIABLES_PAGE_IDS: readonly VariablesPageId[] =
	VARIABLES_PAGES.map((page) => page.id);

export function isVariablesPageId(id: string): id is VariablesPageId {
	return (VARIABLES_PAGE_IDS as readonly string[]).includes(id);
}

export function getVariablesPageDefinition(
	id: VariablesPageId,
): VariablesPageDefinition {
	return VARIABLES_PAGES.find((page) => page.id === id)!;
}

/** Page holding the given zone; zones not claimed by any page fall back to the memory page. */
export function getVariablesPageDefinitionForZone(
	zone: VariableZone,
): VariablesPageDefinition {
	return (
		VARIABLES_PAGES.find((page) =>
			(page.zones as readonly VariableZone[]).includes(zone),
		) ?? getVariablesPageDefinition("memory-variables")
	);
}
