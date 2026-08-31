"use client";
import { ElementType } from "@/schemas/grafcet/element.schema";
import Junction, {
	JUNCTION_HANDLE_PIVOT,
	JunctionData,
} from "@/schemas/grafcet/junction.schema";
import { FLOW_GRID_CELL_WIDTH } from "@/ui/constants";
import HandleWithConnectionsLimit from "@/ui/lib/react-flow/HandleWithConnectionsLimit";
import { useTheme } from "@mui/material";
import {
	Node,
	NodeProps,
	NodeResizer,
	Position,
	useUpdateNodeInternals,
} from "@xyflow/react";
import React, { useEffect, useRef, type FC } from "react";
import GrafcetNode from "../GrafcetNode";
import {
	JunctionNodeContextProvider,
	useJunctionNodeContext,
} from "./context/JunctionNodeContext";
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
	const width = nodeWidth ?? Junction.DEFAULT_DIMENSIONS.width;
	const {
		pivotSelected,
		selectedBranchId,
		selectPreviousBranch,
		selectNextBranch,
		clearSelection,
	} = useJunctionNodeContext();

	const handleKeyDown = useKeyboardEventsHandler(
		id,
		pivotSelected,
		selectedBranchId,
		selectPreviousBranch,
		selectNextBranch,
		clearSelection,
		width,
	);

	const updateNodeInternals = useUpdateNodeInternals();
	const th = useTheme();
	const nodeHTMLElement = useRef<HTMLDivElement>(null);

	const aBarIsSelected = pivotSelected || selectedBranchId != null;

	// Toute variation de position d'un pin (drag, clavier, undo/redo, restauration)
	// doit forcer React Flow à recalculer l'ancrage des liaisons.
	const handlePositionsKey = [
		data.pivotPosition,
		...data.branchesOrder.map((id) => data.branches[id]!.position),
	].join(",");
	useEffect(() => {
		updateNodeInternals(id);
	}, [id, handlePositionsKey, updateNodeInternals]);
	const borderColor = selected ? th.palette.primary.main : "black";

	//Snap to grid
	useEffect(() => {
		if (width % FLOW_GRID_CELL_WIDTH !== 0)
			throw new Error("The width does not snap the grid");
	}, [width]);

	useEffect(() => {
		if (aBarIsSelected && nodeHTMLElement.current)
			nodeHTMLElement.current.focus();
	}, [aBarIsSelected]);

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
				id={JUNCTION_HANDLE_PIVOT}
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
				type={type as ElementType}
				className={`junction-node ${className}`}
				ref={nodeHTMLElement}
				tabIndex={0}
				sx={{
					width: width + "px",
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

const JunctionNode: FC<JunctionNodeProps> = ({
	id,
	data,
	width,
	children,
	...props
}) => {
	return (
		<JunctionNodeContextProvider
			id={id}
			data={data}
			width={width ?? Junction.DEFAULT_DIMENSIONS.width}
		>
			<JunctionNodeContent id={id} data={data} width={width} {...props}>
				{children}
			</JunctionNodeContent>
		</JunctionNodeContextProvider>
	);
};

export default JunctionNode;
