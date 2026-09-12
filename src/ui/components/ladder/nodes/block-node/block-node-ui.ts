import { BlockType } from "@/schemas/ladder/block.schema";

/**
 * Textes portés par l'UI pour un nœud de bloc : clés i18n (namespace `ladderEditor.block`) du
 * libellé fixe affiché dans la boîte et du libellé d'accessibilité du sélecteur en place. Le
 * domaine (`BLOCK_DEFINITIONS`) ne décrit que la présence d'un libellé fixe (`hasStaticLabel`)
 * et d'un `inlineSelect`, jamais leur intitulé.
 */
export const BLOCK_NODE_UI: Record<
	BlockType,
	{ staticLabelKey?: string; inlineSelectAriaKey?: string }
> = {
	"user-program": {},
	timer: { inlineSelectAriaKey: "timerVariantAria" },
	counter: { inlineSelectAriaKey: "counterVariantAria" },
	compare: {},
	assign: { staticLabelKey: "assignStaticLabel" },
	arithmetic: {
		staticLabelKey: "arithmeticStaticLabel",
		inlineSelectAriaKey: "arithmeticOperatorAria",
	},
};
