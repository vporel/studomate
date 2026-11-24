import { GRAFCET_ELEMENT_TYPES } from "@/schemas/grafcet/element.schema";
import { BLOCK_TYPES } from "@/schemas/ladder/block.schema";
import { COIL_TYPES, CONTACT_TYPES } from "@/schemas/ladder/element.schema";

export const LADDER_TOOL_IDS = [
	...CONTACT_TYPES.map((type) => `contact-${type}` as const),
	...COIL_TYPES.map((type) => `coil-${type}` as const),
	...BLOCK_TYPES,
];

/** A tool that places an element on a ladder, from the toolbar or the system blocks palette. */
export type LadderToolId = (typeof LADDER_TOOL_IDS)[number];

export const GRAFCET_TOOL_IDS = [
	"step-initial",
	...GRAFCET_ELEMENT_TYPES,
] as const;

/** A tool that places an element on a grafcet, from the toolbar. `step-initial` is the initial step; `step` any other step. */
export type GrafcetToolId = (typeof GRAFCET_TOOL_IDS)[number];

/** The only tools offered by each editor; an editor left out keeps all of its tools. */
export type EditorTools = {
	ladder?: LadderToolId[];
	grafcet?: GrafcetToolId[];
};

export function isLadderToolAvailable(
	tools: EditorTools | undefined,
	id: LadderToolId,
): boolean {
	return tools?.ladder === undefined || tools.ladder.includes(id);
}

export function isGrafcetToolAvailable(
	tools: EditorTools | undefined,
	id: GrafcetToolId,
): boolean {
	return tools?.grafcet === undefined || tools.grafcet.includes(id);
}
