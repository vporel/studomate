/** Traducteur des libellés du plan (namespace `manual.nav`), fourni par le composant. */
export type NavTranslate = (key: string) => string;

export type ManualSection = {
	id: string;
	/** `id` des sous-sections — leur libellé vit dans `manual.nav.<id>`. */
	children?: string[];
};

/** Plan du manuel : un `id` d'ancre par entrée, le libellé est résolu via `manual.nav.<id>`. */
export const MANUAL_SECTIONS: ManualSection[] = [
	{ id: "intro" },
	{ id: "getting-started" },
	{ id: "projects" },
	{ id: "explorer" },
	{ id: "variables" },
	{
		id: "grafcet",
		children: [
			"grafcet-canvas",
			"grafcet-steps",
			"grafcet-transitions",
			"grafcet-actions",
			"grafcet-junctions",
			"grafcet-referrals",
			"grafcet-comments",
			"grafcet-connections",
		],
	},
	{
		id: "ladder",
		children: [
			"ladder-sections",
			"ladder-contacts",
			"ladder-coils",
			"ladder-blocks",
			"ladder-connections",
		],
	},
	{ id: "toolbar" },
	{
		id: "hmi",
		children: [
			"hmi-pages",
			"hmi-canvas",
			"hmi-widgets",
			"hmi-properties",
			"hmi-animations",
			"hmi-events",
			"hmi-simulation",
		],
	},
	{
		id: "simulation",
		children: [
			"simulation-start",
			"simulation-running",
			"simulation-watch-tables",
			"simulation-stop",
		],
	},
	{
		id: "analysis",
		children: ["analysis-run", "analysis-checks", "analysis-messages"],
	},
	{ id: "shortcuts" },
];

export type FlatManualSection = {
	id: string;
	label: string;
	parentLabel?: string;
	/** A des sous-sections : son propre contenu n'est que l'union de celui de ses enfants,
	 * donc pas pertinent pour une recherche par contenu (seul son titre l'est). */
	hasChildren?: boolean;
};

/** À plat, un item par entrée du plan (parents et enfants), pour la recherche. */
export function flattenManualSections(t: NavTranslate): FlatManualSection[] {
	const flat: FlatManualSection[] = [];
	for (const section of MANUAL_SECTIONS) {
		const hasChildren = (section.children?.length ?? 0) > 0;
		flat.push({ id: section.id, label: t(section.id), hasChildren });
		for (const childId of section.children ?? []) {
			flat.push({
				id: childId,
				label: t(childId),
				parentLabel: t(section.id),
			});
		}
	}
	return flat;
}
