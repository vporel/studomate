"use client";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import Junction, { JunctionData } from "@/schemas/grafcet/Junction.class";
import { FLOW_GRID_CELL_WIDTH } from "@/ui/constants";
import HandleWithConnectionsLimit from "@/ui/lib/react-flow/HandleWithConnectionsLimit";
import { useTheme } from "@mui/material";
import { Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import React, { useEffect, useRef, type FC } from "react";
import GrafcetNode from "../GrafcetNode";
import { JunctionNodeContextProvider, useJunctionNodeContext } from "./context/JunctionNodeContext";
import useKeyboardEventsHandler from "./useKeyboardEventsHandler";

export type JunctionNodeType = Node<JunctionData>;

export type JunctionNodeProps = NodeProps<JunctionNodeType> & {
	orientation: "start" | "end";
	className?: string;
	children: React.ReactNode;
};

const JunctionNodeContent: FC<JunctionNodeProps> = ({
	id,
	type,
	data,
	selected,
	width: nodeWidth,
	orientation,
	className,
	children,
}) => {
	const { pivotSelected, selectedBranchId, selectPreviousBranch, selectNextBranch, clearSelection } =
		useJunctionNodeContext();

	const handleKeyDown = useKeyboardEventsHandler(
		id,
		pivotSelected,
		selectedBranchId,
		selectPreviousBranch,
		selectNextBranch,
		clearSelection,
	);

	const th = useTheme();
	const nodeHTMLElement = useRef<HTMLDivElement>(null);
	const borderColor = selected ? th.palette.primary.main : "black";

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
				{children}
			</GrafcetNode>
		</>
	);
};

const JunctionNode: FC<JunctionNodeProps> = ({ id, data, children, ...props }) => {
	return (
		<JunctionNodeContextProvider id={id} data={data}>
			<JunctionNodeContent id={id} data={data} {...props}>
				{children}
			</JunctionNodeContent>
		</JunctionNodeContextProvider>
	);
};

export default JunctionNode;
