"use client";

import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { ContactType } from "@/schemas/ladder/element.schema";
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
import ContactSymbol from "./ContactSymbol";
import { getHighlightOverlaySx } from "./node-highlight";
import { contactLetsPowerThrough } from "@/ui/utils/ladder/ladder-power-flow";
import { getContactMemoryVariableId } from "@/project-analyser/analysers/ladder/ladder.analyser";

export type ContactNodeData = { variable: string; type: ContactType };
export type ContactNodeType = Node<ContactNodeData> & { type: "contact" };

/** Dimensions d'un contact = 1 cellule de grille. Exporté pour les tests et le layout. */
export const CONTACT_NODE_DIMENSIONS = {
	width: GRID_CELL_WIDTH,
	height: GRID_CELL_HEIGHT,
};

const ContactNode = ({ id, data, selected }: NodeProps<ContactNodeType>) => {
	const { variable, type } = data;
	const th = useTheme();
	const pageVisible = usePageVisible();
	const ladderId = useLadderStore((state) => state.ladder.id);
	// Surbrillance locale : le contact conduirait si le courant l'atteignait (expression vraie
	// selon son type), indépendamment de ce qui se passe en amont sur le rail.
	const energized = useProjectStore((state) => {
		if (!pageVisible) return false;
		const states = Object.values(state.simulationVariablesStates);
		const variableValue = states.find((v) => v.mnemonic === variable)?.value;
		const memVarId = getContactMemoryVariableId(ladderId, id);
		return contactLetsPowerThrough(
			type,
			variableValue,
			state.simulationVariablesStates[memVarId]?.value,
		);
	});
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
					top: "-5px",
				}}
			>
				{/* Pas de typeFilter : outil pédagogique, l'utilisateur doit pouvoir se tromper de
					variable (l'analyseur le signalera) plutôt que d'en être empêché ici. */}
				<VariableSelector
					ref={variableSelectorRef}
					value={variable}
					onCommit={handleCommitVariable}
					className="nodrag"
					sx={{ width: 44, mb: "2px" }}
				/>
			</Box>
			<Box sx={{ width: "100%", height: 20 }}>
				<ContactSymbol
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
			<Handle id="source" type="source" position={Position.Right} />
		</Box>
	);
};

export default ContactNode;
