"use client";

import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { CoilMode } from "@/schemas/ladder/element.schema";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import VariableSelector, { VariableSelectorHandle } from "@/ui/components/variables/VariableSelector";
import { GRID_CELL_HEIGHT, GRID_CELL_WIDTH } from "@/ui/utils/ladder/ladder-flow-builder";
import { Box, useTheme, alpha } from "@mui/material";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { useRef } from "react";
import CoilSymbol from "./CoilSymbol";

export type CoilNodeData = { variable: string; mode: CoilMode };
export type CoilNodeType = Node<CoilNodeData> & { type: "coil" };

/** Dimensions d'une bobine = 1 cellule de grille. Exportée pour les tests et le layout. */
export const COIL_NODE_DIMENSIONS = { width: GRID_CELL_WIDTH, height: GRID_CELL_HEIGHT };

const CoilNode = ({ id, data, selected }: NodeProps<CoilNodeType>) => {
	const { variable, mode } = data;
	const th = useTheme();
	const energized = useProjectStore((state) =>
		Object.values(state.simulationVariablesStates).some(
			(v) => v.mnemonic === variable && v.value === true,
		),
	);
	const highlighted = useLadderStore((state) => state.highlightedNodesIds?.includes(id));
	const commandsStackManager = useLadderStore((state) => state.commandsStackManager);
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
				...(highlighted
					? {
							"&::before": {
								content: '""',
								position: "absolute",
								top: "12px",
								left: "0",
								right: "0",
								bottom: "12px",
								border: "4px solid",
								borderColor: th.palette.primary.main,
								borderRadius: "4px",
								animation: "ladder-node-blink 1s infinite linear",
							},
							"@keyframes ladder-node-blink": {
								"0%": { borderColor: th.palette.primary.main },
								"50%": { borderColor: alpha(th.palette.primary.main, 0.25) },
								"100%": { borderColor: th.palette.primary.main },
							},
						}
					: {}),
			}}
		>
			<Handle id="target" type="target" position={Position.Left} />
			<Box
				sx={{
					position: "absolute",
					top: "-10px",
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
					mode={mode}
					color={selected ? th.palette.primary.main : energized ? th.palette.energized.main : "black"}
				/>
			</Box>
		</Box>
	);
};

export default CoilNode;
