"use client";
import Transition, {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
	TransitionData,
} from "@/schemas/grafcet/transition.schema";
import HandleWithConnectionsLimit from "@/ui/lib/react-flow/HandleWithConnectionsLimit";
import { Box, useTheme } from "@mui/material";
import { Node, NodeProps, Position } from "@xyflow/react";
import React, { type FC } from "react";

import { usePageVisible } from "@/ui/components/pages/page-visibility-context";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import GrafcetNode from "./GrafcetNode";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type TransitionNodeType = Node<TransitionData> & {
	type: "transition";
};

export type TransitionNodeProps = NodeProps<TransitionNodeType>;

const TEXTAREA_LINE_HEIGHT_REM = 1.2;
const TEXTAREA_MAX_LINES = 6;

/** Ajuste la hauteur de la textarea à son contenu (rétrécit d'abord pour permettre la réduction). */
function fitTextareaHeight(el: HTMLTextAreaElement | null): void {
	if (!el) return;
	el.style.height = "auto";
	el.style.height = el.scrollHeight + "px";
}

const TransitionNode: FC<TransitionNodeProps> = ({ id, data, selected }) => {
	const th = useTheme();
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const [
		editingExpression,
		setEditingExpression,
		editing,
		setEditing,
		saveExpression,
		error,
	] = useWithTextNodeValue(id, "transition", data, "expression", false);
	// La hauteur impérative posée par `onChange` n'est pas réappliquée aux rendus suivants
	// (blur, montage, mise à jour externe) : sans ce recalcul, la textarea retombe sur sa
	// hauteur plafonnée et une scrollbar apparaît dès la 2ᵉ ligne.
	React.useLayoutEffect(() => {
		fitTextareaHeight(textareaRef.current);
	}, [editingExpression]);
	const pageVisible = usePageVisible();
	const trueInSimulator = useProjectStore(
		(state) => pageVisible && state.evaluableExpressionsValues[id] === true,
	);
	const colorIfTrueInSimulation = th.palette.primary.main;
	const borderColor = trueInSimulator
		? colorIfTrueInSimulation
		: selected
			? th.palette.primary.main
			: "black";

	return (
		<>
			<HandleWithConnectionsLimit
				limit={1}
				id={TRANSITION_HANDLE_TARGET_PREDECESSOR}
				type="target"
				position={Position.Top}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<HandleWithConnectionsLimit
				limit={1}
				id={TRANSITION_HANDLE_SOURCE_SUCCESSOR}
				type="source"
				position={Position.Bottom}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<GrafcetNode
				id={id}
				type="transition"
				error={error}
				sx={{
					position: "relative",
					width: Transition.DEFAULT_DIMENSIONS.width + "px",
					height: Transition.DEFAULT_DIMENSIONS.height + "px",
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
				onDoubleClick={() => {
					setEditing(true);
					textareaRef.current?.focus();
				}}
			>
				<Box
					sx={{
						width: "1px",
						marginLeft: "-0.5px",
						height: "100%",
						background: borderColor,
						position: "relative",
						"&::before": {
							content: '""',
							position: "absolute",
							width: "25px",
							height: "2px",
							background: borderColor,
							top: "50%",
							left: "-12.5px",
						},
					}}
				></Box>
				<Box
					sx={{
						position: "absolute",
						left: "calc(100% + 5px)",
						height: "100%",
						width: "230px",
						display: "flex",
						alignItems: "center",
					}}
				>
					<textarea
						ref={textareaRef}
						className="node__input transition_node__textarea nodrag"
						value={editingExpression}
						onChange={(e) => {
							setEditingExpression(e.target.value);
							fitTextareaHeight(e.target);
						}}
						onKeyDown={(e) => {
							if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") {
								//The save is done only on blur to avoid multiple saves when pressing enter
								textareaRef.current?.blur();
							}
						}}
						onBlur={() => {
							setEditing(false);
							saveExpression();
						}}
						rows={1}
						style={{
							width: "100%",
							height: "auto",
							maxHeight: `${TEXTAREA_LINE_HEIGHT_REM * TEXTAREA_MAX_LINES}rem`,
							border: "none",
							outline: "none",
							resize: "none",
							overflowY: "auto",
							padding: "0",
							lineHeight: `${TEXTAREA_LINE_HEIGHT_REM}rem`,
							fontSize: "0.75rem",
							pointerEvents: !editing ? "none" : "all",
							color: trueInSimulator ? colorIfTrueInSimulation : "black",
							background: editing ? th.palette.grey[200] : "transparent",
						}}
					/>
				</Box>
			</GrafcetNode>
		</>
	);
};

export default TransitionNode;
