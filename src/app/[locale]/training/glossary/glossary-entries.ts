import type { TrainingModuleId } from "@/training/module-ids";

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
	/** A translatable figure has a `<name>-en.svg` and a `<name>-es.svg` variant for the English and Spanish locales. */
	translatable: boolean;
	width: number;
};

export type GlossaryEntryDef = {
	id: string;
	section: GlossarySection;
	figure?: GlossaryFigure;
	/** Ids of related entries, shown as links under the definition. */
	related: string[];
	/** Training step that teaches the notion. */
	lesson?: { module: TrainingModuleId; step: string };
};

const GLOSSARY_ENTRIES: GlossaryEntryDef[] = [
	{
		id: "plc",
		section: "general",
		related: ["scan-cycle", "input", "output"],
		lesson: { module: "a0", step: "automatisme" },
	},
	{
		id: "variable",
		section: "general",
		related: ["mnemonic", "input", "output"],
		lesson: { module: "a0", step: "logic-basics" },
	},
	{
		id: "mnemonic",
		section: "general",
		related: ["variable"],
		lesson: { module: "a2", step: "ladder-basics" },
	},
	{
		id: "input",
		section: "general",
		related: ["output", "push-button", "switch", "wiring"],
		lesson: { module: "a0", step: "automatisme" },
	},
	{
		id: "output",
		section: "general",
		related: ["input", "contactor"],
		lesson: { module: "a0", step: "automatisme" },
	},
	{
		id: "scan-cycle",
		section: "general",
		figure: { name: "scan-cycle", translatable: true, width: 520 },
		related: ["plc", "execution-order"],
		lesson: { module: "a0", step: "scan-cycle" },
	},
	{
		id: "execution-order",
		section: "general",
		related: ["scan-cycle"],
		lesson: { module: "a2", step: "theory-set-reset" },
	},
	{
		id: "truth-table",
		section: "general",
		related: ["and", "or", "not"],
		lesson: { module: "a2", step: "ladder-basics" },
	},
	{
		id: "and",
		section: "general",
		related: ["or", "not", "series-parallel"],
		lesson: { module: "a0", step: "logic-basics" },
	},
	{
		id: "or",
		section: "general",
		related: ["and", "not", "series-parallel"],
		lesson: { module: "a0", step: "logic-basics" },
	},
	{
		id: "not",
		section: "general",
		related: ["and", "or"],
		lesson: { module: "a0", step: "logic-basics" },
	},
	{
		id: "push-button",
		section: "general",
		related: ["switch", "wiring", "input"],
		lesson: { module: "a2", step: "theory-contacts-coils" },
	},
	{
		id: "switch",
		section: "general",
		related: ["push-button", "wiring", "input"],
		lesson: { module: "a2", step: "theory-contacts-coils" },
	},
	{
		id: "contactor",
		section: "general",
		related: ["output"],
		lesson: { module: "a2", step: "theory-contacts-coils" },
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
		lesson: { module: "a2", step: "theory-contacts-coils" },
	},
	{
		id: "edge",
		section: "general",
		related: ["rising-edge", "falling-edge", "edge-contacts"],
		lesson: { module: "a2", step: "theory-edges" },
	},
	{
		id: "rising-edge",
		section: "general",
		related: ["edge", "falling-edge"],
		lesson: { module: "a2", step: "theory-edges" },
	},
	{
		id: "falling-edge",
		section: "general",
		related: ["edge", "rising-edge"],
		lesson: { module: "a2", step: "theory-edges" },
	},
	{
		id: "chronogram",
		section: "general",
		related: ["scan-cycle"],
		lesson: { module: "a2", step: "theory-edges" },
	},
	{
		id: "grafcet",
		section: "grafcet",
		related: ["step", "transition", "receptivity", "ladder"],
		lesson: { module: "a1", step: "grafcet-definition" },
	},
	{
		id: "step",
		section: "grafcet",
		figure: { name: "step", translatable: true, width: 380 },
		related: ["initial-step", "action", "transition", "step-variable"],
		lesson: { module: "a1", step: "theory" },
	},
	{
		id: "initial-step",
		section: "grafcet",
		related: ["step", "reinitialize"],
		lesson: { module: "a1", step: "theory" },
	},
	{
		id: "action",
		section: "grafcet",
		figure: { name: "action", translatable: true, width: 300 },
		related: ["step", "set-action", "output"],
		lesson: { module: "a1", step: "theory-actions" },
	},
	{
		id: "transition",
		section: "grafcet",
		figure: { name: "transition", translatable: true, width: 300 },
		related: ["receptivity", "evolution", "step"],
		lesson: { module: "a1", step: "theory" },
	},
	{
		id: "receptivity",
		section: "grafcet",
		related: ["transition", "evolution"],
		lesson: { module: "a1", step: "theory" },
	},
	{
		id: "directed-link",
		section: "grafcet",
		related: ["step", "transition"],
		lesson: { module: "a1", step: "theory" },
	},
	{
		id: "evolution",
		section: "grafcet",
		related: ["transition", "upstream-downstream"],
		lesson: { module: "a1", step: "theory" },
	},
	{
		id: "upstream-downstream",
		section: "grafcet",
		related: ["evolution"],
		lesson: { module: "a1", step: "theory" },
	},
	{
		id: "step-variable",
		section: "grafcet",
		related: ["step"],
		lesson: { module: "a1", step: "theory" },
	},
	{
		id: "set-action",
		section: "grafcet",
		related: ["action", "set-reset"],
		lesson: { module: "a1", step: "theory-actions" },
	},
	{
		id: "divergences",
		section: "grafcet",
		figure: { name: "divergences", translatable: true, width: 420 },
		related: ["or-divergence", "and-divergence", "convergence", "branch"],
		lesson: { module: "a1", step: "theory-or-divergence" },
	},
	{
		id: "or-divergence",
		section: "grafcet",
		related: ["and-divergence", "exclusivity", "divergences"],
		lesson: { module: "a1", step: "theory-or-divergence" },
	},
	{
		id: "and-divergence",
		section: "grafcet",
		related: ["or-divergence", "convergence"],
		lesson: { module: "a1", step: "theory-and-divergence" },
	},
	{
		id: "convergence",
		section: "grafcet",
		related: ["divergences", "branch"],
		lesson: { module: "a1", step: "theory-or-divergence" },
	},
	{
		id: "branch",
		section: "grafcet",
		related: ["divergences"],
		lesson: { module: "a1", step: "theory-or-divergence" },
	},
	{
		id: "exclusivity",
		section: "grafcet",
		related: ["or-divergence"],
		lesson: { module: "a1", step: "theory-or-divergence" },
	},
	{
		id: "reinitialize",
		section: "grafcet",
		related: ["initial-step"],
		lesson: { module: "a5", step: "theory-grafcet-reset" },
	},
	{
		id: "ladder",
		section: "ladder",
		related: ["network", "contact", "coil"],
		lesson: { module: "a2", step: "ladder-basics" },
	},
	{
		id: "rails",
		section: "ladder",
		related: ["network"],
		lesson: { module: "a2", step: "ladder-basics" },
	},
	{
		id: "network",
		section: "ladder",
		related: ["contact", "coil", "execution-order"],
		lesson: { module: "a2", step: "ladder-basics" },
	},
	{
		id: "contact",
		section: "ladder",
		figure: { name: "contacts", translatable: true, width: 380 },
		related: ["coil", "wiring", "series-parallel"],
		lesson: { module: "a2", step: "theory-contacts-coils" },
	},
	{
		id: "coil",
		section: "ladder",
		figure: { name: "coil", translatable: true, width: 300 },
		related: ["contact", "network", "output"],
		lesson: { module: "a2", step: "theory-contacts-coils" },
	},
	{
		id: "series-parallel",
		section: "ladder",
		figure: { name: "series-parallel", translatable: true, width: 420 },
		related: ["and", "or"],
		lesson: { module: "a2", step: "ladder-basics" },
	},
	{
		id: "internal-memory",
		section: "ladder",
		related: ["variable", "set-reset", "retentive"],
		lesson: { module: "a2", step: "theory-contacts-coils" },
	},
	{
		id: "self-holding",
		section: "ladder",
		figure: { name: "self-holding", translatable: true, width: 420 },
		related: ["priority-stop", "set-reset", "internal-memory"],
		lesson: { module: "a2", step: "theory-self-holding" },
	},
	{
		id: "priority-stop",
		section: "ladder",
		related: ["self-holding"],
		lesson: { module: "a2", step: "theory-self-holding" },
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
		lesson: { module: "a2", step: "theory-set-reset" },
	},
	{
		id: "retentive",
		section: "ladder",
		related: ["set-reset", "internal-memory"],
		lesson: { module: "a2", step: "theory-set-reset" },
	},
	{
		id: "edge-contacts",
		section: "ladder",
		figure: { name: "edge-contacts", translatable: true, width: 360 },
		related: ["edge", "rising-edge", "falling-edge"],
		lesson: { module: "a2", step: "theory-edges" },
	},
	{
		id: "toggle",
		section: "ladder",
		related: ["edge-contacts", "set-reset"],
		lesson: { module: "a2", step: "theory-edges" },
	},
	{
		id: "double-coil",
		section: "ladder",
		related: ["network", "execution-order"],
		lesson: { module: "a2", step: "theory-set-reset" },
	},
	{
		id: "function-block",
		section: "ladder-advanced",
		figure: { name: "timer-block", translatable: false, width: 300 },
		related: ["timer", "counter", "instance"],
		lesson: { module: "a3", step: "theory-timers" },
	},
	{
		id: "instance",
		section: "ladder-advanced",
		related: ["function-block", "timer", "counter"],
		lesson: { module: "a3", step: "theory-timers" },
	},
	{
		id: "timer",
		section: "ladder-advanced",
		related: ["ton", "tof", "tp", "system-time-bases"],
		lesson: { module: "a3", step: "theory-timers" },
	},
	{
		id: "ton",
		section: "ladder-advanced",
		related: ["timer", "tof", "tp"],
		lesson: { module: "a3", step: "theory-timers" },
	},
	{
		id: "tof",
		section: "ladder-advanced",
		related: ["timer", "ton", "tp"],
		lesson: { module: "a3", step: "theory-timers" },
	},
	{
		id: "tp",
		section: "ladder-advanced",
		related: ["timer", "ton", "tof"],
		lesson: { module: "a3", step: "theory-timers" },
	},
	{
		id: "system-time-bases",
		section: "ladder-advanced",
		related: ["timer"],
		lesson: { module: "a3", step: "theory-timers" },
	},
	{
		id: "counter",
		section: "ladder-advanced",
		related: ["preset-value", "function-block", "rising-edge"],
		lesson: { module: "a3", step: "theory-counters" },
	},
	{
		id: "preset-value",
		section: "ladder-advanced",
		related: ["counter"],
		lesson: { module: "a3", step: "theory-counters" },
	},
	{
		id: "data-type",
		section: "ladder-advanced",
		related: ["conversion", "overflow"],
		lesson: { module: "a3", step: "theory-types" },
	},
	{
		id: "conversion",
		section: "ladder-advanced",
		related: ["data-type"],
		lesson: { module: "a3", step: "theory-types" },
	},
	{
		id: "overflow",
		section: "ladder-advanced",
		related: ["data-type"],
		lesson: { module: "a3", step: "theory-types" },
	},
	{
		id: "scaling",
		section: "ladder-advanced",
		related: ["data-type"],
		lesson: { module: "a3", step: "theory-types" },
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
		lesson: { module: "a3", step: "theory-structure" },
	},
	{
		id: "main",
		section: "ladder-advanced",
		related: ["subprogram"],
		lesson: { module: "a3", step: "theory-structure" },
	},
];

export default GLOSSARY_ENTRIES;
