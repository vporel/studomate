"use client";

import { getConvertBlockFunctionName } from "@/schemas/ladder/block.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { LadderRenderContext } from "@/ui/pdf/drawing/ladder-render-context";
import { useMemo } from "react";

/**
 * Contexte de rendu ladder pour l'export PDF : les libellés que le schéma seul ne porte pas
 * (nom du programme cible d'un renvoi, libellé statique d'un bloc affectation/calcul/conversion,
 * intitulé d'un réseau).
 */
export default function useLadderRenderContext(): LadderRenderContext {
	const project = useProjectStore((state) => state.project);
	const tBlock = useT("ladderEditor.block");
	const tSectionHeader = useT("ladderEditor.sectionHeader");
	return useMemo(
		() => ({
			programName: (id) =>
				project?.ladders[id]?.name ?? project?.grafcets[id]?.name,
			blockStaticLabel: (blockType) =>
				blockType === "assign"
					? tBlock("assignStaticLabel")
					: blockType === "arithmetic"
						? tBlock("arithmeticStaticLabel")
						: blockType === "convert"
							? tBlock("convertStaticLabel")
							: undefined,
			convertFunctionName: (params) =>
				getConvertBlockFunctionName(
					params,
					(mnemonic) =>
						project?.variables.find((v) => v.mnemonic === mnemonic)?.type,
				) ?? undefined,
			sectionHeading: (number, title) =>
				title
					? tSectionHeader("pdfHeadingWithTitle", { number, title })
					: tSectionHeader("pdfHeading", { number }),
		}),
		[project, tBlock, tSectionHeader],
	);
}
