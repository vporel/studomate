"use client";

import {
	BLOCK_OPERAND_LITERALS,
	COMPARE_OPERATORS,
	CompareBlockParams,
} from "@/schemas/ladder/block.schema";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import VariableSelector from "@/ui/components/variables/VariableSelector";
import {
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { Box, useTheme } from "@mui/material";
import { Handle, Position } from "@xyflow/react";
import { getHighlightOverlaySx } from "../node-highlight";
import OperatorSelect from "./OperatorSelect";

/**
 * Rendu d'un bloc `"compare"` : une case de la taille d'un contact contenant seulement
 * l'opérateur (menu au clic) ; IN1 et IN2 sont positionnés en absolu au-dessus et en dessous,
 * hors de la case. N'utilise pas la mise en page « boîte + ligne structurelle + pinoches » de
 * `BlockNode` (timer/counter/assign/user-program) — `BlockNode` aiguille ici selon `blockType`.
 * Les ports structurels IN/Q restent portés par le modèle (voir `BLOCK_PORT_LABELS`) et câblés
 * sur le rail via les deux `Handle`, mais ne sont plus affichés.
 */
export default function CompareBlockNode({
	id,
	data,
	selected,
}: {
	id: string;
	data: { blockType: "compare"; params: CompareBlockParams };
	selected: boolean;
}) {
	const th = useTheme();
	const highlighted = useLadderStore((state) =>
		state.highlightedNodesIds?.includes(id),
	);
	const color = selected ? th.palette.primary.main : "black";
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);
	const { in1, in2, operator } = data.params;

	const commit = (changes: Partial<CompareBlockParams>) => {
		commandsStackManager.executeOperation([
			new ElementUpdateCommand({
				elementId: id,
				changes: { data: { params: { ...data.params, ...changes } } },
				previousChanges: { data: { params: data.params } },
			}),
		]);
	};

	const operandSx = {
		position: "absolute" as const,
		left: "50%",
		transform: "translateX(-50%)",
	};

	return (
		<Box
			sx={{
				width: GRID_CELL_WIDTH,
				height: GRID_CELL_HEIGHT,
				position: "relative",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				...getHighlightOverlaySx(highlighted, th),
			}}
		>
			<Handle id="target" type="target" position={Position.Left} />
			<Handle id="source" type="source" position={Position.Right} />

			<Box
				sx={{
					position: "absolute",
					left: "0%",
					top: "calc(50% - 1px)",
					width: "15%",
					height: "2px",
					background: color,
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					right: 0,
					top: "calc(50% - 1px)",
					width: "15%",
					height: "2px",
					background: color,
				}}
			/>
			<Box sx={{ ...operandSx, bottom: "50%" }}>
				<VariableSelector
					value={in1}
					onCommit={(next) => commit({ in1: next })}
					acceptedLiterals={[...BLOCK_OPERAND_LITERALS]}
					className="nodrag"
					sx={{ width: 52 }}
				/>
			</Box>

			<Box
				sx={{
					width: "70%",
					height: "40%",
					inset: 0,
					border: "1.5px solid",
					borderColor: color,
					borderRadius: "3px",
					bgcolor: th.palette.background.paper,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<OperatorSelect
					value={operator}
					onChange={(next) => commit({ operator: next })}
					operators={COMPARE_OPERATORS}
					ariaLabel="Opérateur de comparaison"
				/>
			</Box>

			<Box sx={{ ...operandSx, top: "70%" }}>
				<VariableSelector
					value={in2}
					onCommit={(next) => commit({ in2: next })}
					acceptedLiterals={[...BLOCK_OPERAND_LITERALS]}
					className="nodrag"
					sx={{ width: 52 }}
				/>
			</Box>
		</Box>
	);
}
