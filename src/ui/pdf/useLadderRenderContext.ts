"use client";

import { useProjectContext } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { LadderRenderContext } from "@/ui/pdf/drawing/ladder-render-context";
import { useMemo } from "react";

/**
 * Ladder rendering context for PDF and image export: the labels the schema alone doesn't carry
 * (name of a jump's target program, static label of an assign/arithmetic/convert block, network
 * heading). Program names are read from the project when the export draws, so this hook doesn't
 * re-render its caller on every project edit.
 */
export default function useLadderRenderContext(): LadderRenderContext {
	const projectStore = useProjectContext();
	const tBlock = useT("ladderEditor.block");
	const tSectionHeader = useT("ladderEditor.sectionHeader");
	return useMemo(
		() => ({
			programName: (id) => {
				const project = projectStore?.getState().project;
				return project?.ladders[id]?.name ?? project?.grafcets[id]?.name;
			},
			blockStaticLabel: (blockType) =>
				blockType === "assign"
					? tBlock("assignStaticLabel")
					: blockType === "arithmetic"
						? tBlock("arithmeticStaticLabel")
						: blockType === "convert"
							? tBlock("convertStaticLabel")
							: undefined,
			sectionHeading: (number, title) =>
				title
					? tSectionHeader("pdfHeadingWithTitle", { number, title })
					: tSectionHeader("pdfHeading", { number }),
		}),
		[projectStore, tBlock, tSectionHeader],
	);
}
