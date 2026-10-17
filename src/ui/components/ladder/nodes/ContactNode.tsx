"use client";

import { getContactPulseVariableId } from "@/project-analyser/analysers/ladder/ladder.analyser";
import { ContactType } from "@/schemas/ladder/element.schema";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { usePageVisible } from "@/ui/components/pages/page-visibility-context";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import {
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { contactLetsPowerThrough } from "@/ui/utils/ladder/ladder-power-flow";
import { useTheme } from "@mui/material";
import { Node, NodeProps } from "@xyflow/react";
import ContactSymbol from "./ContactSymbol";
import LadderVariableNodeShell from "./LadderVariableNodeShell";

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
		const variableValue =
			state.simulationVariablesStatesByMnemonic[variable]?.value;
		const pulseVarId = getContactPulseVariableId(ladderId, id);
		return contactLetsPowerThrough(
			type,
			variableValue,
			state.simulationVariablesStates[pulseVarId]?.value,
		);
	});

	return (
		<LadderVariableNodeShell
			id={id}
			variable={variable}
			labelTop={-5}
			hasSourceHandle
		>
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
		</LadderVariableNodeShell>
	);
};

export default ContactNode;
