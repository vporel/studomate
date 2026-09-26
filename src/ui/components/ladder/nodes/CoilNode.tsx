"use client";

import { CoilType } from "@/schemas/ladder/element.schema";
import { usePageVisible } from "@/ui/components/pages/page-visibility-context";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import {
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { useTheme } from "@mui/material";
import { Node, NodeProps } from "@xyflow/react";
import CoilSymbol from "./CoilSymbol";
import LadderVariableNodeShell from "./LadderVariableNodeShell";

export type CoilNodeData = { variable: string; type: CoilType };
export type CoilNodeType = Node<CoilNodeData> & { type: "coil" };

/** Dimensions d'une bobine = 1 cellule de grille. Exportée pour les tests et le layout. */
export const COIL_NODE_DIMENSIONS = {
	width: GRID_CELL_WIDTH,
	height: GRID_CELL_HEIGHT,
};

const CoilNode = ({ id, data, selected }: NodeProps<CoilNodeType>) => {
	const { variable, type } = data;
	const th = useTheme();
	const pageVisible = usePageVisible();
	const energized = useProjectStore(
		(state) =>
			pageVisible &&
			state.simulationVariablesStatesByMnemonic[variable]?.value === true,
	);

	return (
		<LadderVariableNodeShell id={id} variable={variable} labelTop={-5}>
			<CoilSymbol
				type={type}
				color={
					selected
						? th.palette.primary.main
						: energized
							? th.palette.energized.main
							: "black"
				}
			/>
		</LadderVariableNodeShell>
	);
};

export default CoilNode;
