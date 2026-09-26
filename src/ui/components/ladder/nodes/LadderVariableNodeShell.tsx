"use client";

import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import VariableSelector, {
	VariableSelectorHandle,
} from "@/ui/components/variables/VariableSelector";
import {
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { Box, useTheme } from "@mui/material";
import { Handle, Position } from "@xyflow/react";
import { ReactNode, useRef } from "react";
import { getHighlightOverlaySx } from "./node-highlight";

type LadderVariableNodeShellProps = {
	id: string;
	variable: string;
	/** Vertical offset of the variable selector above the symbol, in px (negative = up). */
	labelTop: number;
	hasSourceHandle?: boolean;
	/** The symbol, rendered below the variable selector. */
	children: ReactNode;
};

/**
 * One grid cell of a ladder node bound to a variable (contact, coil): connection handles,
 * highlight overlay, variable selector committed through the ladder commands stack, and the
 * symbol passed as children.
 */
const LadderVariableNodeShell = ({
	id,
	variable,
	labelTop,
	hasSourceHandle,
	children,
}: LadderVariableNodeShellProps) => {
	const th = useTheme();
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
					top: `${labelTop}px`,
				}}
			>
				{/* Pas de typeFilter/excludeDirection : outil pédagogique, l'utilisateur doit pouvoir
					se tromper de variable (l'analyseur le signalera) plutôt que d'en être empêché ici. */}
				<VariableSelector
					ref={variableSelectorRef}
					value={variable}
					onCommit={handleCommitVariable}
					// Le menu contextuel du nœud Ladder porte déjà « Références croisées ».
					disableContextMenu
					className="nodrag"
					sx={{ width: 44, mb: "2px" }}
					showSimulationValue={false}
				/>
			</Box>
			<Box sx={{ width: "100%", height: 20 }}>{children}</Box>
			{hasSourceHandle && (
				<Handle id="source" type="source" position={Position.Right} />
			)}
		</Box>
	);
};

export default LadderVariableNodeShell;
