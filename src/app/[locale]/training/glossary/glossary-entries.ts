export const GLOSSARY_SECTIONS = [
	"general",
	"grafcet",
	"ladder",
	"ladder-advanced",
] as const;

export type GlossarySection = (typeof GLOSSARY_SECTIONS)[number];

export type GlossaryFigure = {
	/** File name without extension, in `public/glossary/<section>/`. */
	name: string;
	/** A translatable figure has a `<name>-en.svg` variant for the English locale. */
	translatable: boolean;
	width: number;
};

export type GlossaryEntryDef = {
	id: string;
	section: GlossarySection;
	figure?: GlossaryFigure;
	/** Ids of related entries, shown as links under the definition. */
	related: string[];
};

const GLOSSARY_ENTRIES: GlossaryEntryDef[] = [
	{
		id: "plc",
		section: "general",
		related: ["scan-cycle", "input", "output"],
	},
	{
		id: "variable",
		section: "general",
		related: ["mnemonic", "input", "output"],
	},
	{
		id: "mnemonic",
		section: "general",
		related: ["variable"],
	},
	{
		id: "input",
		section: "general",
		related: ["output", "push-button", "switch", "wiring"],
	},
	{
		id: "output",
		section: "general",
		related: ["input", "contactor"],
	},
	{
		id: "scan-cycle",
		section: "general",
		figure: { name: "scan-cycle", translatable: true, width: 520 },
		related: ["plc", "execution-order"],
	},
	{
		id: "execution-order",
		section: "general",
		related: ["scan-cycle"],
	},
	{
		id: "truth-table",
		section: "general",
		related: ["and", "or", "not"],
	},
	{
		id: "and",
		section: "general",
		related: ["or", "not", "series-parallel"],
	},
	{
		id: "or",
		section: "general",
		related: ["and", "not", "series-parallel"],
	},
	{
		id: "not",
		section: "general",
		related: ["and", "or"],
	},
	{
		id: "push-button",
		section: "general",
		related: ["switch", "wiring", "input"],
	},
	{
		id: "switch",
		section: "general",
		related: ["push-button", "wiring", "input"],
	},
	{
		id: "contactor",
		section: "general",
		related: ["output"],
	},
	{
		id: "limit-switch",
		section: "general",
		related: ["input"],
	},
	{
		id: "wiring",
		section: "general",
		figure: { name: "wiring-no-nc", translatable: true, width: 460 },
		related: ["contact", "input", "push-button"],
	},
	{
		id: "edge",
		section: "general",
		related: ["rising-edge", "falling-edge", "edge-contacts"],
	},
	{
		id: "rising-edge",
		section: "general",
		related: ["edge", "falling-edge"],
	},
	{
		id: "falling-edge",
		section: "general",
		related: ["edge", "rising-edge"],
	},
	{
		id: "chronogram",
		section: "general",
		related: ["scan-cycle"],
	},
	{
		id: "step",
		section: "grafcet",
		figure: { name: "step", translatable: true, width: 380 },
		related: ["initial-step", "action", "transition", "step-variable"],
	},
	{
		id: "initial-step",
		section: "grafcet",
		related: ["step", "reinitialize"],
	},
	{
		id: "action",
		section: "grafcet",
		figure: { name: "action", translatable: true, width: 300 },
		related: ["step", "set-action", "output"],
	},
	{
		id: "transition",
		section: "grafcet",
		figure: { name: "transition", translatable: true, width: 300 },
		related: ["receptivity", "evolution", "step"],
	},
	{
		id: "receptivity",
		section: "grafcet",
		related: ["transition", "evolution"],
	},
	{
		id: "directed-link",
		section: "grafcet",
		related: ["step", "transition"],
	},
	{
		id: "evolution",
		section: "grafcet",
		related: ["transition", "upstream-downstream"],
	},
	{
		id: "upstream-downstream",
		section: "grafcet",
		related: ["evolution"],
	},
	{
		id: "step-variable",
		section: "grafcet",
		related: ["step"],
	},
	{
		id: "set-action",
		section: "grafcet",
		related: ["action", "set-reset"],
	},
	{
		id: "divergences",
		section: "grafcet",
		figure: { name: "divergences", translatable: true, width: 420 },
		related: ["or-divergence", "and-divergence", "convergence", "branch"],
	},
	{
		id: "or-divergence",
		section: "grafcet",
		related: ["and-divergence", "exclusivity", "divergences"],
	},
	{
		id: "and-divergence",
		section: "grafcet",
		related: ["or-divergence", "convergence"],
	},
	{
		id: "convergence",
		section: "grafcet",
		related: ["divergences", "branch"],
	},
	{
		id: "branch",
		section: "grafcet",
		related: ["divergences"],
	},
	{
		id: "exclusivity",
		section: "grafcet",
		related: ["or-divergence"],
	},
	{
		id: "reinitialize",
		section: "grafcet",
		related: ["initial-step"],
	},
	{
		id: "ladder",
		section: "ladder",
		related: ["network", "contact", "coil"],
	},
	{
		id: "rails",
		section: "ladder",
		related: ["network"],
	},
	{
		id: "network",
		section: "ladder",
		related: ["contact", "coil", "execution-order"],
	},
	{
		id: "contact",
		section: "ladder",
		figure: { name: "contacts", translatable: true, width: 380 },
		related: ["coil", "wiring", "series-parallel"],
	},
	{
		id: "coil",
		section: "ladder",
		figure: { name: "coil", translatable: true, width: 300 },
		related: ["contact", "network", "output"],
	},
	{
		id: "series-parallel",
		section: "ladder",
		figure: { name: "series-parallel", translatable: true, width: 420 },
		related: ["and", "or"],
	},
	{
		id: "internal-memory",
		section: "ladder",
		related: ["variable", "set-reset", "retentive"],
	},
	{
		id: "self-holding",
		section: "ladder",
		figure: { name: "self-holding", translatable: true, width: 420 },
		related: ["priority-stop", "set-reset", "internal-memory"],
	},
	{
		id: "priority-stop",
		section: "ladder",
		related: ["self-holding"],
	},
	{
		id: "interlock",
		section: "ladder",
		related: ["self-holding"],
	},
	{
		id: "set-reset",
		section: "ladder",
		related: ["internal-memory", "self-holding", "retentive"],
	},
	{
		id: "retentive",
		section: "ladder",
		related: ["set-reset", "internal-memory"],
	},
	{
		id: "edge-contacts",
		section: "ladder",
		figure: { name: "edge-contacts", translatable: true, width: 360 },
		related: ["edge", "rising-edge", "falling-edge"],
	},
	{
		id: "toggle",
		section: "ladder",
		related: ["edge-contacts", "set-reset"],
	},
	{
		id: "double-coil",
		section: "ladder",
		related: ["network", "execution-order"],
	},
	{
		id: "function-block",
		section: "ladder-advanced",
		figure: { name: "timer-block", translatable: false, width: 300 },
		related: ["timer", "counter", "instance"],
	},
	{
		id: "instance",
		section: "ladder-advanced",
		related: ["function-block", "timer", "counter"],
	},
	{
		id: "timer",
		section: "ladder-advanced",
		related: ["ton", "tof", "tp", "system-time-bases"],
	},
	{
		id: "ton",
		section: "ladder-advanced",
		related: ["timer", "tof", "tp"],
	},
	{
		id: "tof",
		section: "ladder-advanced",
		related: ["timer", "ton", "tp"],
	},
	{
		id: "tp",
		section: "ladder-advanced",
		related: ["timer", "ton", "tof"],
	},
	{
		id: "system-time-bases",
		section: "ladder-advanced",
		related: ["timer"],
	},
	{
		id: "counter",
		section: "ladder-advanced",
		related: ["preset-value", "function-block", "rising-edge"],
	},
	{
		id: "preset-value",
		section: "ladder-advanced",
		related: ["counter"],
	},
	{
		id: "data-type",
		section: "ladder-advanced",
		related: ["conversion", "overflow"],
	},
	{
		id: "conversion",
		section: "ladder-advanced",
		related: ["data-type"],
	},
	{
		id: "overflow",
		section: "ladder-advanced",
		related: ["data-type"],
	},
	{
		id: "scaling",
		section: "ladder-advanced",
		related: ["data-type"],
	},
	{
		id: "hysteresis",
		section: "ladder-advanced",
		related: ["scaling"],
	},
	{
		id: "subprogram",
		section: "ladder-advanced",
		related: ["main", "function-block"],
	},
	{
		id: "main",
		section: "ladder-advanced",
		related: ["subprogram"],
	},
];

export default GLOSSARY_ENTRIES;
