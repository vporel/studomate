"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { LadderRenderContext } from "@/ui/lib/program-export-drawing/ladder-render-context";
import { useMemo } from "react";

/**
 * Contexte de rendu ladder pour l'export PDF : les libellés que le schéma seul ne porte pas
 * (nom du programme cible d'un renvoi, libellé statique d'un bloc affectation/calcul).
 */
export default function useLadderRenderContext(): LadderRenderContext {
	const project = useProjectStore((state) => state.project);
	const tBlock = useT("ladderEditor.block");
	return useMemo(
		() => ({
			programName: (id) =>
				project?.ladders[id]?.name ?? project?.grafcets[id]?.name,
			blockStaticLabel: (blockType) =>
				blockType === "assign"
					? tBlock("assignStaticLabel")
					: blockType === "arithmetic"
						? tBlock("arithmeticStaticLabel")
						: undefined,
		}),
		[project, tBlock],
	);
}
