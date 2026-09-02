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
	/** Clé i18n (namespace `ladderEditor.systemBlocks`) du libellé dans la section « Blocs
	 * systèmes » de l'explorateur — résolue par le consommateur. */
	explorerLabelKey: string;
	explorerItemId: string;
	ExplorerIcon: ElementType;
	/** Présent si le bloc a aussi un outil dédié dans la toolbar du ladder (blocs configurés
	 * entièrement sur le canevas — pas ceux à fenêtre). `symbol` est le texte court affiché dans
	 * l'icône rectangulaire, `labelKey` la clé i18n de l'infobulle. */
	toolbar?: { labelKey: string; symbol: string; width: number };
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
		explorerLabelKey: "timerLabel",
		explorerItemId: "system-block-timer",
		ExplorerIcon: TimerBlockIcon,
		interaction: "config-dialog",
	},
	{
		blockType: "counter",
		explorerLabelKey: "counterLabel",
		explorerItemId: "system-block-counter",
		ExplorerIcon: CounterBlockIcon,
		interaction: "config-dialog",
	},
	{
		blockType: "compare",
		explorerLabelKey: "compareLabel",
		explorerItemId: "system-block-compare",
		ExplorerIcon: CompareBlockIcon,
		toolbar: {
			labelKey: "compareToolbarLabel",
			symbol: "COMPARE",
			width: 68,
		},
		interaction: "direct-insert",
	},
	{
		blockType: "assign",
		explorerLabelKey: "assignLabel",
		explorerItemId: "system-block-assign",
		ExplorerIcon: AssignBlockIcon,
		toolbar: {
			labelKey: "assignToolbarLabel",
			symbol: "ASSIGN",
			width: 54,
		},
		interaction: "direct-insert",
	},
	{
		blockType: "arithmetic",
		explorerLabelKey: "arithmeticLabel",
		explorerItemId: "system-block-arithmetic",
		ExplorerIcon: ArithmeticBlockIcon,
		toolbar: {
			labelKey: "arithmeticToolbarLabel",
			symbol: "CALC",
			width: 44,
		},
		interaction: "direct-insert",
	},
];
