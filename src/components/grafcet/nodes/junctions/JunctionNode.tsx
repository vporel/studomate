"use client";
import { FLOW_GRID_CELL_WIDTH } from "@/constants";
import HandleWithConnectionsLimit from "@/lib/react-flow/HandleWithConnectionsLimit";
import Junction, { JunctionData } from "@/schemas/grafcet/junction.class";
import { useTheme } from "@mui/material";
import { Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import React, { useEffect, useRef, type FC } from "react";
import GrafcetNode from "../GrafcetNode";
import useBarMoveHandler from "./useBarMoveHandler";
import useBranchActions from "./useBranchActions";
import useBranchAddButtonsPositions from "./useBranchAddButtonsPositions";
import useBranchesPositionsAdapter from "./useBranchesPositionsAdapter";
import useSelectedBars from "./useSelectedBars";

export type JunctionNodeType = Node<JunctionData>;

export type JunctionNodeProps = NodeProps<JunctionNodeType> & {
	orientation: "start" | "end";
	className?: string;
	children: (props: {
		branchAddButtonsPositions: number[]; //In pixels from the left of the node
		onBranchAdd: (buttonIndex: number) => void;
		selectedBranchIndex: number; //-1 if no one
		pivotSelected: boolean;
	}) => React.ReactNode;
};

const JunctionNode: FC<JunctionNodeProps> = ({
	id,
	type,
	positionAbsoluteX,
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
	const [pivotSelected, selectedBranchIndex] = useSelectedBars(id);
	const { add: onBranchAdd } = useBranchActions(id, data);
	const handleKeyDown = useBarMoveHandler(id, pivotSelected, selectedBranchIndex);

	useBranchesPositionsAdapter(id, nodeWidth, positionAbsoluteX);

	//Snap to grid
	useEffect(() => {
		if (data.width % FLOW_GRID_CELL_WIDTH !== 0) throw new Error("The width does not snap the grid");
	}, [data.width]);

	useEffect(() => {
		if ((pivotSelected || selectedBranchIndex != -1) && nodeHTMLElement.current)
			nodeHTMLElement.current.focus();
	}, [pivotSelected, selectedBranchIndex]);

	return (
		<>
			<NodeResizer
				isVisible={selected}
				minWidth={Junction.defaultDimensions.width}
				minHeight={Junction.defaultDimensions.height}
				maxHeight={Junction.defaultDimensions.height}
			/>
			{data.branchesPositions.map((pos, index) => (
				<HandleWithConnectionsLimit
					key={index}
					limit={1}
					id={"branch-" + (index + 1)}
					type={orientation == "start" ? "source" : "target"}
					position={orientation == "start" ? Position.Bottom : Position.Top}
					style={{
						left: pos + "px",
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
				type={type}
				className={`junction-node ${className}`}
				ref={nodeHTMLElement}
				tabIndex={0}
				sx={{
					width: (nodeWidth != 0 ? nodeWidth : data.width) + "px",
					height: Junction.defaultDimensions.height + "px",
					display: "flex",
					flexDirection: "column",
					position: "relative",
					".junction-node__branch__add-button": {
						visibility: "hidden",
						opacity: 0,
					},
					"&:hover": {
						".junction-node__branch__add-button": {
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
					selectedBranchIndex,
					pivotSelected,
				})}
			</GrafcetNode>
		</>
	);
};

export default JunctionNode;
