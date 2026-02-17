"use client";
import { FLOW_GRID_CELL_WIDTH } from "@/constants";
import HandleWithConnectionsLimit from "@/lib/react-flow/HandleWithConnectionsLimit";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import Junction, { JunctionData } from "@/schemas/grafcet/Junction.class";
import { useTheme } from "@mui/material";
import { Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import React, { useEffect, useRef, type FC } from "react";
import GrafcetNode from "../GrafcetNode";
import useBarsSelection from "./useBarsSelection";
import useBranchActions from "./useBranchActions";
import useBranchAddButtonsPositions from "./useBranchAddButtonsPositions";
import useContextMenuEventsHandler from "./useContextMenuEventsHandler";
import useKeyboardEventsHandler from "./useKeyboardEventsHandler";

export type JunctionNodeType = Node<JunctionData>;

export type JunctionNodeProps = NodeProps<JunctionNodeType> & {
	orientation: "start" | "end";
	className?: string;
	children: (props: {
		branchAddButtonsPositions: number[]; //In pixels from the left of the node
		onBranchAdd: (buttonIndex: number) => void;
		selectedBranchId: string | null; //null if no one
		pivotSelected: boolean;
	}) => React.ReactNode;
};

const JunctionNode: FC<JunctionNodeProps> = ({
	id,
	type,
	data,
	selected,
	width: nodeWidth,
	orientation,
	className,
	children,
}) => {
	const th = useTheme();
	const nodeHTMLElement = useRef<HTMLDivElement>(null);
	const borderColor = selected ? th.palette.primary.main : "black";
	const branchAddButtonsPositions = useBranchAddButtonsPositions(data);
	const {
		pivotSelected,
		selectedBranchId,
		selectPivot,
		selectBranch,
		selectPreviousBranch,
		selectNextBranch,
		clearSelection,
	} = useBarsSelection(data.branchesOrder);
	const { add: onBranchAdd } = useBranchActions(id, data);
	const handleKeyDown = useKeyboardEventsHandler(
		id,
		pivotSelected,
		selectedBranchId,
		selectPreviousBranch,
		selectNextBranch,
		clearSelection,
	);

	useContextMenuEventsHandler(id, selectPivot, selectBranch);

	//Snap to grid
	useEffect(() => {
		if (data.width % FLOW_GRID_CELL_WIDTH !== 0) throw new Error("The width does not snap the grid");
	}, [data.width]);

	useEffect(() => {
		if ((pivotSelected || selectedBranchId != null) && nodeHTMLElement.current)
			nodeHTMLElement.current.focus();
	}, [pivotSelected, selectedBranchId]);

	return (
		<>
			<NodeResizer
				isVisible={selected}
				minWidth={Junction.DEFAULT_DIMENSIONS.width}
				minHeight={Junction.DEFAULT_DIMENSIONS.height}
				maxHeight={Junction.DEFAULT_DIMENSIONS.height}
			/>
			{data.branchesOrder.map((branchId) => (
				<HandleWithConnectionsLimit
					key={branchId}
					limit={1}
					id={branchId}
					type={orientation == "start" ? "source" : "target"}
					position={orientation == "start" ? Position.Bottom : Position.Top}
					style={{
						left: data.branches[branchId]!.position + "px",
						borderColor: borderColor,
						backgroundColor: borderColor,
					}}
				/>
			))}
			<HandleWithConnectionsLimit
				limit={1}
				id="pivot"
				type={orientation == "start" ? "target" : "source"}
				position={orientation == "start" ? Position.Top : Position.Bottom}
				style={{
					left: data.pivotPosition + "px",
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<GrafcetNode
				id={id}
				type={type as GrafcetElementType}
				className={`junction-node ${className}`}
				ref={nodeHTMLElement}
				tabIndex={0}
				sx={{
					width: (nodeWidth != 0 ? nodeWidth : data.width) + "px",
					height: Junction.DEFAULT_DIMENSIONS.height + "px",
					display: "flex",
					flexDirection: "column",
					position: "relative",
					".junction-node__add-branch-button": {
						visibility: "hidden",
						opacity: 0,
					},
					"&:hover": {
						".junction-node__add-branch-button": {
							visibility: "visible",
							opacity: 1,
						},
					},
				}}
				onKeyDown={handleKeyDown}
			>
				{children({
					branchAddButtonsPositions,
					onBranchAdd,
					selectedBranchId,
					pivotSelected,
				})}
			</GrafcetNode>
		</>
	);
};

export default JunctionNode;
