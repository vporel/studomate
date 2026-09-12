"use client";

import {
	BLOCK_DEFINITIONS,
	resolvePortSpecs,
	resolveStructuralPorts,
} from "@/schemas/ladder/block-definition";
import { BlockData } from "@/schemas/ladder/block.schema";
import {
	getBlockHeightInCellUnits,
	getParameterPinRows,
} from "@/schemas/ladder/block-port.schema";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { GRID_CELL_HEIGHT } from "@/ui/utils/ladder/ladder-flow-builder";
import { Box, useTheme } from "@mui/material";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { getHighlightOverlaySx } from "../node-highlight";
import { BLOCK_NODE_UI } from "./block-node-ui";
import BlockNameField from "./BlockNameField";
import BlockStructuralRow from "./BlockStructuralRow";
import CompareBlockNode from "./CompareBlockNode";
import { BLOCK_NODE_DIMENSIONS, PIN_ROW_HEIGHT } from "./dimensions";
import OperatorSelect from "./OperatorSelect";
import ParamPinRow from "./ParamPinRow";

export type BlockNodeData = BlockData;
export type BlockNodeType = Node<BlockNodeData> & { type: "block" };

export { BLOCK_NODE_DIMENSIONS };

const BlockNode = ({ id, data, selected }: NodeProps<BlockNodeType>) => {
	// Une famille en `render: "custom"` a un rendu propre, hors de la mise en page « boîte + ligne
	// structurelle + pinoches » de `BoxBlockNode` (compare : boîte contact-like IN1 / opérateur / IN2).
	if (data.blockType === "compare")
		return <CompareBlockNode id={id} data={data} selected={selected} />;

	return <BoxBlockNode id={id} data={data} selected={selected} />;
};

export default BlockNode;

type BoxBlockData = Exclude<BlockData, { blockType: "compare" }>;

const BoxBlockNode = ({
	id,
	data,
	selected,
}: {
	id: string;
	data: BoxBlockData;
	selected: boolean;
}) => {
	const th = useTheme();
	const t = useT("ladderEditor.block");
	const def = BLOCK_DEFINITIONS[data.blockType];
	const ui = BLOCK_NODE_UI[data.blockType];
	const programName =
		useProjectStore((state) =>
			data.blockType === "user-program"
				? state.project?.ladders[data.params.programId]?.name
				: undefined,
		) ?? "";
	// `user-program` n'a pas de libellé fixe : c'est le nom du programme référencé (résolu dans le
	// store). Timer/compteur portent leur nom dans un champ éditable (`labelSlot`). Toute autre
	// famille tire son libellé de `BLOCK_DEFINITIONS` (fixe).
	const label =
		def.hasStaticLabel && ui.staticLabelKey
			? t(ui.staticLabelKey as never)
			: data.blockType === "user-program"
				? programName
				: "";
	const highlighted = useLadderStore((state) =>
		state.highlightedNodesIds?.includes(id),
	);
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);

	const ports = resolveStructuralPorts(data);
	const portSpecs = resolvePortSpecs(data);
	const height = getBlockHeightInCellUnits(portSpecs) * GRID_CELL_HEIGHT;
	const parameterRows = getParameterPinRows(portSpecs);

	const runUpdate = (params: BlockData["params"]) =>
		commandsStackManager.executeOperation([
			new ElementUpdateCommand({
				elementId: id,
				changes: { data: { params } },
				previousChanges: { data: { params: data.params } },
			}),
		]);

	return (
		<Box
			sx={{
				width: BLOCK_NODE_DIMENSIONS.width,
				height,
				position: "relative",
				...getHighlightOverlaySx(highlighted, th),
			}}
		>
			{/* Ancrées sur la première ligne (structurelle) : le rail se câble toujours à cette
				hauteur, quel que soit le nombre de lignes de pins du bloc. */}
			<Handle
				id="target"
				type="target"
				position={Position.Left}
				style={{ top: PIN_ROW_HEIGHT / 2 }}
			/>
			<Handle
				id="source"
				type="source"
				position={Position.Right}
				style={{ top: PIN_ROW_HEIGHT / 2 }}
			/>
			<Box
				sx={{
					border: "1.5px solid",
					borderColor: selected ? th.palette.primary.main : "black",
					width: "100%",
					height: "75%",
					marginTop: "6.5px",
				}}
			/>
			<BlockStructuralRow
				label={label}
				labelSlot={
					data.blockType === "timer" || data.blockType === "counter" ? (
						<BlockNameField
							value={data.params.name}
							onCommit={(name) => runUpdate({ ...data.params, name })}
						/>
					) : undefined
				}
				inputLabel={ports.input}
				outputLabel={ports.output}
			/>
			{parameterRows.map((row, index) => (
				<ParamPinRow
					// Décalage d'un demi-`GRID_CELL_HEIGHT` par ligne depuis le haut de la première
					// (structurelle), pas d'une cellule pleine — voir `getBlockHeightInCellUnits`.
					key={row.input?.suffix ?? row.output?.suffix ?? index}
					top={(GRID_CELL_HEIGHT / 2) * (index + 1)}
					row={row}
					getValue={(suffix) => def.readParam(data.params, suffix)}
					onCommit={(suffix, value) =>
						runUpdate(def.writeParam(data.params, suffix, value))
					}
				/>
			))}
			{def.inlineSelect && (
				<Box
					sx={{
						position: "absolute",
						left: "50%",
						transform: "translateX(-50%)",
						top: "10%",
					}}
				>
					<OperatorSelect
						value={def.inlineSelect.read(data.params)}
						onChange={(value) =>
							runUpdate(def.inlineSelect!.write(data.params, value))
						}
						operators={def.inlineSelect.values}
						ariaLabel={
							ui.inlineSelectAriaKey ? t(ui.inlineSelectAriaKey as never) : ""
						}
					/>
				</Box>
			)}
		</Box>
	);
};
