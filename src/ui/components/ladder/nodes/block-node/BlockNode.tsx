"use client";

import {
	getBlockHeightInCellUnits,
	getParameterPinRows,
} from "@/schemas/function-blocks/function-block.schema";
import { getCounterPortSpecs } from "@/schemas/function-blocks/counter.schema";
import { TIMER_PORT_SPECS } from "@/schemas/function-blocks/timer.schema";
import { BLOCK_PORT_LABELS, BlockData } from "@/schemas/ladder/block.schema";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { GRID_CELL_HEIGHT } from "@/ui/utils/ladder/ladder-flow-builder";
import { Box, useTheme } from "@mui/material";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import BlockStructuralRow from "./BlockStructuralRow";
import { BLOCK_NODE_DIMENSIONS, PIN_ROW_HEIGHT } from "./dimensions";
import ParamPinRow from "./ParamPinRow";
import { getHighlightOverlaySx } from "../node-highlight";

export type BlockNodeData = BlockData;
export type BlockNodeType = Node<BlockNodeData> & { type: "block" };

export { BLOCK_NODE_DIMENSIONS };

const BlockNode = ({ id, data, selected }: NodeProps<BlockNodeType>) => {
	const th = useTheme();
	const programName =
		useProjectStore((state) =>
			data.blockType === "user-program"
				? state.project?.ladders[data.params.programId]?.name
				: undefined,
		) ?? "";
	const label =
		data.blockType === "user-program"
			? programName
			: data.blockType === "compare"
				? "Compare"
				: data.blockType === "assign"
					? "Assign"
					: data.params.name;
	const highlighted = useLadderStore((state) => state.highlightedNodesIds?.includes(id));
	const commandsStackManager = useLadderStore((state) => state.commandsStackManager);
	const workflowManager = useLadderStore((state) => state.workflowManager);

	// Seul le compteur a des ports structurels dépendant de sa variante (IN/R pour CTU, CD/LD pour
	// CTD) — `BLOCK_PORT_LABELS["counter"]` ne porte que le défaut CTU.
	const ports =
		data.blockType === "counter" && data.params.counterType === "CTD"
			? { input: "CD", output: "Q" }
			: BLOCK_PORT_LABELS[data.blockType];
	const portSpecs =
		data.blockType === "timer"
			? TIMER_PORT_SPECS
			: data.blockType === "counter"
				? getCounterPortSpecs(data.params.counterType)
				: [];
	const height = getBlockHeightInCellUnits(portSpecs) * GRID_CELL_HEIGHT;
	const parameterRows = getParameterPinRows(portSpecs);

	// La valeur/l'écriture restent spécifiques aux champs concrets de chaque famille (`pt`/`et`
	// pour un timer, `control`/`pv`/`cv` pour un compteur), contrairement à la mise en page
	// (générique, voir `ParamPinRow`).
	const getParamValue = (suffix: string): string => {
		if (data.blockType === "timer") return suffix === "PT" ? data.params.pt : (data.params.et ?? "");
		if (data.blockType === "counter") {
			if (suffix === "PV") return data.params.pv;
			if (suffix === "CV") return data.params.cv ?? "";
			return data.params.control;
		}
		return "";
	};
	const commitParam = (suffix: string, value: string) => {
		if (data.blockType === "timer") {
			const changes = suffix === "PT" ? { pt: value } : { et: value };
			commandsStackManager.executeOperation([
				new ElementUpdateCommand({
					elementId: id,
					changes: { data: { params: { ...data.params, ...changes } } },
					previousChanges: { data: { params: data.params } },
				}),
			]);
		} else if (data.blockType === "counter") {
			const changes = suffix === "PV" ? { pv: value } : suffix === "CV" ? { cv: value } : { control: value };
			commandsStackManager.executeOperation([
				new ElementUpdateCommand({
					elementId: id,
					changes: { data: { params: { ...data.params, ...changes } } },
					previousChanges: { data: { params: data.params } },
				}),
			]);
		}
	};

	return (
		<Box
			onDoubleClick={() => {
				if (data.blockType === "timer") workflowManager.openSystemBlockEditor(id, "timer", data.params);
				else if (data.blockType === "counter") workflowManager.openSystemBlockEditor(id, "counter", data.params);
				else if (data.blockType === "compare") workflowManager.openSystemBlockEditor(id, "compare", data.params);
				else if (data.blockType === "assign") workflowManager.openSystemBlockEditor(id, "assign", data.params);
			}}
			sx={{
				width: BLOCK_NODE_DIMENSIONS.width,
				height,
				position: "relative",
				...getHighlightOverlaySx(highlighted, th),
			}}
		>
			{/* Ancrées sur la première ligne (structurelle) : le rail se câble toujours à cette
				hauteur, quel que soit le nombre de lignes de pins du bloc. */}
			<Handle id="target" type="target" position={Position.Left} style={{ top: PIN_ROW_HEIGHT / 2 }} />
			<Handle id="source" type="source" position={Position.Right} style={{ top: PIN_ROW_HEIGHT / 2 }} />
			<Box
				sx={{
					border: "1.5px solid",
					borderColor: selected ? th.palette.primary.main : "black",
					width: "100%",
					height: "75%",
					marginTop: "6.5px",
				}}
			/>
			<BlockStructuralRow label={label} inputLabel={ports.input} outputLabel={ports.output} />
			{parameterRows.map((row, index) => (
				<ParamPinRow
					// Décalage d'un demi-`GRID_CELL_HEIGHT` par ligne depuis le haut de la première
					// (structurelle), pas d'une cellule pleine — voir `getBlockHeightInCellUnits`.
					key={row.input?.suffix ?? row.output?.suffix ?? index}
					top={(GRID_CELL_HEIGHT / 2) * (index + 1)}
					row={row}
					getValue={getParamValue}
					onCommit={commitParam}
				/>
			))}
		</Box>
	);
};

export default BlockNode;
