export type ManualSubSection = { id: string; label: string };
export type ManualSection = {
	id: string;
	label: string;
	children?: ManualSubSection[];
};

export const MANUAL_SECTIONS: ManualSection[] = [
	{ id: "intro", label: "Introduction" },
	{ id: "getting-started", label: "Démarrer" },
	{ id: "projects", label: "Projets" },
	{ id: "explorer", label: "Explorateur" },
	{ id: "variables", label: "Variables" },
	{
		id: "grafcet",
		label: "Grafcet",
		children: [
			{ id: "grafcet-canvas", label: "Canvas" },
			{ id: "grafcet-steps", label: "Étapes" },
			{ id: "grafcet-transitions", label: "Transitions" },
			{ id: "grafcet-actions", label: "Actions" },
			{ id: "grafcet-junctions", label: "Jonctions" },
			{ id: "grafcet-referrals", label: "Renvois" },
			{ id: "grafcet-comments", label: "Commentaires" },
			{ id: "grafcet-connections", label: "Liaisons" },
		],
	},
	{
		id: "ladder",
		label: "Ladder",
		children: [
			{ id: "ladder-sections", label: "Réseaux" },
			{ id: "ladder-contacts", label: "Contacts" },
			{ id: "ladder-coils", label: "Bobines" },
			{ id: "ladder-blocks", label: "Blocs" },
			{ id: "ladder-connections", label: "Connexions" },
		],
	},
	{ id: "toolbar", label: "Barre d'outils" },
	{
		id: "hmi",
		label: "Interfaces HMI",
		children: [
			{ id: "hmi-pages", label: "Pages HMI" },
			{ id: "hmi-canvas", label: "Canvas" },
			{ id: "hmi-widgets", label: "Widgets" },
			{ id: "hmi-properties", label: "Propriétés" },
			{ id: "hmi-animations", label: "Animations" },
			{ id: "hmi-events", label: "Événements" },
			{ id: "hmi-simulation", label: "Simulation HMI" },
		],
	},
	{
		id: "simulation",
		label: "Simulation",
		children: [
			{ id: "simulation-start", label: "Démarrer" },
			{ id: "simulation-running", label: "Pendant la simulation" },
			{ id: "simulation-watch-tables", label: "Tables de variables" },
			{ id: "simulation-stop", label: "Arrêter" },
		],
	},
	{
		id: "analysis",
		label: "Analyse",
		children: [
			{ id: "analysis-run", label: "Lancer l'analyse" },
			{ id: "analysis-checks", label: "Types de vérifications" },
			{ id: "analysis-messages", label: "Exemples de messages" },
		],
	},
	{ id: "shortcuts", label: "Raccourcis clavier" },
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
export function flattenManualSections(): FlatManualSection[] {
	const flat: FlatManualSection[] = [];
	for (const section of MANUAL_SECTIONS) {
		const hasChildren = (section.children?.length ?? 0) > 0;
		flat.push({ id: section.id, label: section.label, hasChildren });
		for (const child of section.children ?? []) {
			flat.push({
				id: child.id,
				label: child.label,
				parentLabel: section.label,
			});
		}
	}
	return flat;
}
