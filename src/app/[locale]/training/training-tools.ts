import type { EditorTools } from "@/ui/stores/project/editor-tools";

/**
 * The tools offered by every training block, unless a step lists its own for an editor. A tool
 * added to an editor is not offered in the training until it is listed here.
 */
export const DEFAULT_TRAINING_TOOLS: EditorTools = {
	ladder: [
		"contact-NO",
		"contact-NF",
		"contact-P",
		"contact-N",
		"coil-normal",
		"coil-inverted",
		"coil-set",
		"coil-reset",
		"coil-rising",
		"coil-falling",
		"timer",
		"counter",
		"compare",
		"assign",
		"arithmetic",
		"convert",
	],
	grafcet: [
		"step-initial",
		"step",
		"action",
		"transition",
		"junction-or-start",
		"junction-or-end",
		"junction-and-start",
		"junction-and-end",
		"step-referral-source",
		"step-referral-target",
		"comment",
	],
};

/** A solution is only observed and simulated: no editor offers a tool. */
export const NO_TOOLS: EditorTools = { ladder: [], grafcet: [] };

/** A single sequence: steps, transitions and actions, looping back by a connection or a step referral. */
export const GRAFCET_SEQUENCE_TOOLS: EditorTools = {
	grafcet: [
		"step-initial",
		"step",
		"transition",
		"action",
		"step-referral-source",
		"step-referral-target",
	],
};

export const GRAFCET_OR_DIVERGENCE_TOOLS: EditorTools = {
	grafcet: [
		...GRAFCET_SEQUENCE_TOOLS.grafcet!,
		"junction-or-start",
		"junction-or-end",
	],
};

export const GRAFCET_AND_DIVERGENCE_TOOLS: EditorTools = {
	grafcet: [
		...GRAFCET_SEQUENCE_TOOLS.grafcet!,
		"junction-and-start",
		"junction-and-end",
	],
};

/** A program to read and simulate, not to edit. */
export const LADDER_READING_TOOLS: EditorTools = { ladder: [] };

/** Contacts NO and NF, normal coil. */
export const LADDER_BASIC_TOOLS: EditorTools = {
	ladder: ["contact-NO", "contact-NF", "coil-normal"],
};

/** The basic tools and the coils S and R. */
export const LADDER_MEMORY_TOOLS: EditorTools = {
	ladder: [...LADDER_BASIC_TOOLS.ladder!, "coil-set", "coil-reset"],
};

/** The memory tools and the contacts P and N. */
export const LADDER_EDGES_TOOLS: EditorTools = {
	ladder: [...LADDER_MEMORY_TOOLS.ladder!, "contact-P", "contact-N"],
};
