"use client";

import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { CoilType } from "@/schemas/ladder/element.schema";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { usePageVisible } from "@/ui/components/pages/page-visibility-context";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import VariableSelector, {
	VariableSelectorHandle,
} from "@/ui/components/variables/VariableSelector";
import {
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { Box, useTheme } from "@mui/material";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { useRef } from "react";
import CoilSymbol from "./CoilSymbol";
import { getHighlightOverlaySx } from "./node-highlight";

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
			Object.values(state.simulationVariablesStates).some(
				(v) => v.mnemonic === variable && v.value === true,
			),
	);
	const highlighted = useLadderStore((state) =>
		state.highlightedNodesIds?.includes(id),
	);
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);
	const variableSelectorRef = useRef<VariableSelectorHandle>(null);

	const handleCommitVariable = (next: string) => {
		commandsStackManager.executeOperation([
			new ElementUpdateCommand({
				elementId: id,
				changes: { data: { variable: next } },
				previousChanges: { data: { variable } },
			}),
		]);
	};

	return (
		<Box
			onDoubleClick={() => variableSelectorRef.current?.startEditing()}
			sx={{
				width: GRID_CELL_WIDTH,
				height: GRID_CELL_HEIGHT,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
				...getHighlightOverlaySx(highlighted, th),
			}}
		>
			<Handle id="target" type="target" position={Position.Left} />
			<Box
				sx={{
					position: "absolute",
					top: "-7px",
				}}
			>
				{/* Pas de typeFilter/excludeDirection : outil pédagogique, l'utilisateur doit pouvoir
					se tromper de variable (l'analyseur le signalera) plutôt que d'en être empêché ici. */}
				<VariableSelector
					ref={variableSelectorRef}
					value={variable}
					onCommit={handleCommitVariable}
					className="nodrag"
					sx={{ width: 44, mb: "2px" }}
				/>
			</Box>
			<Box sx={{ width: "100%", height: 20 }}>
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
			</Box>
		</Box>
	);
};

export default CoilNode;
