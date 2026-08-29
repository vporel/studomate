import { BlockType } from "@/schemas/ladder/block.schema";
import ArithmeticBlockIcon from "@/ui/components/icons/ArithmeticBlockIcon";
import AssignBlockIcon from "@/ui/components/icons/AssignBlockIcon";
import CompareBlockIcon from "@/ui/components/icons/CompareBlockIcon";
import CounterBlockIcon from "@/ui/components/icons/CounterBlockIcon";
import TimerBlockIcon from "@/ui/components/icons/TimerBlockIcon";
import { ElementType } from "react";

/** Familles de bloc posables comme « bloc système » — tout sauf l'appel de programme utilisateur,
 * qui se glisse depuis l'arbre des programmes de l'explorateur. */
export type SystemBlockType = Exclude<BlockType, "user-program">;

export type SystemBlockCatalogEntry = {
	blockType: SystemBlockType;
	/** Libellé et icône dans la section « Blocs systèmes » de l'explorateur. */
	explorerLabel: string;
	explorerItemId: string;
	ExplorerIcon: ElementType;
	/** Présent si le bloc a aussi un outil dédié dans la toolbar du ladder (blocs configurés
	 * entièrement sur le canevas — pas ceux à fenêtre). `symbol` est le texte court affiché dans
	 * l'icône rectangulaire, `label` l'infobulle. */
	toolbar?: { label: string; symbol: string; width: number };
	/** `"config-dialog"` : la dépose ouvre une fenêtre de configuration avant insertion (timer,
	 * compteur). `"direct-insert"` : insère un bloc vide, configuré ensuite sur le canevas. */
	interaction: "direct-insert" | "config-dialog";
};

/**
 * Source unique décrivant chaque bloc système : palette de l'explorateur, outil de toolbar et
 * comportement de dépose en dérivent (voir `ExplorerSystemBlocksItems`, `LadderToolbar`,
 * `useLadderDropHandlers`). Ajouter un bloc système = une entrée ici.
 */
export const SYSTEM_BLOCK_CATALOG: SystemBlockCatalogEntry[] = [
	{
		blockType: "timer",
		explorerLabel: "Temporisation",
		explorerItemId: "system-block-timer",
		ExplorerIcon: TimerBlockIcon,
		interaction: "config-dialog",
	},
	{
		blockType: "counter",
		explorerLabel: "Compteur",
		explorerItemId: "system-block-counter",
		ExplorerIcon: CounterBlockIcon,
		interaction: "config-dialog",
	},
	{
		blockType: "compare",
		explorerLabel: "Comparaison",
		explorerItemId: "system-block-compare",
		ExplorerIcon: CompareBlockIcon,
		toolbar: {
			label: "Bloc Compare — compare deux valeurs",
			symbol: "COMPARE",
			width: 68,
		},
		interaction: "direct-insert",
	},
	{
		blockType: "assign",
		explorerLabel: "Affectation",
		explorerItemId: "system-block-assign",
		ExplorerIcon: AssignBlockIcon,
		toolbar: {
			label: "Bloc Assign — affecte une valeur à une variable",
			symbol: "ASSIGN",
			width: 54,
		},
		interaction: "direct-insert",
	},
	{
		blockType: "arithmetic",
		explorerLabel: "Calcul",
		explorerItemId: "system-block-arithmetic",
		ExplorerIcon: ArithmeticBlockIcon,
		toolbar: {
			label: "Bloc calc - Opération arithmétique",
			symbol: "CALC",
			width: 44,
		},
		interaction: "direct-insert",
	},
];
