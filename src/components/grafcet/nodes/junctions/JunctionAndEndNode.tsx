"use client";
import { Box, useTheme } from "@mui/material";
import { NodeProps } from "@xyflow/react";
import { type FC } from "react";
import JunctionNode, { JunctionNodeType } from "./JunctionNode";
import JunctionNodeBranchAddButton from "./JunctionNodeBranchAddButton";
import JunctionNodeVerticalBar from "./JunctionNodeVerticalBar";

export type JunctionAndEndNodeType = JunctionNodeType & {
	type: "junction-and-end";
};

export type JunctionAndEndNodeProps = NodeProps<JunctionAndEndNodeType>;

const JunctionAndEndNode: FC<JunctionAndEndNodeProps> = (props) => {
	const { data, selected } = props;
	const th = useTheme();
	const borderColor = selected ? th.palette.primary.main : "black";

	return (
		<JunctionNode
			orientation="end"
			className="junction-and-end-node"
			{...props}
		>
			{({
				branchAddButtonsPositions,
				onBranchAdd,
				selectedBranchIndex,
				pivotSelected,
			}) => (
				<>
					<Box
						sx={{
							width: "100%",
							height: "13px",
							position: "relative",
						}}
					>
						{data.branchesPositions.map((pos, index) => (
							<JunctionNodeVerticalBar
								key={index}
								color={borderColor}
								left={pos}
								selected={selectedBranchIndex == index}
							/>
						))}
					</Box>
					<Box
						sx={{
							width: "100%",
							height: "1px",
							background: borderColor,
						}}
					/>
					<Box
						sx={{
							width: "100%",
							height: "1px",
							background: borderColor,
							marginTop: "3px",
						}}
					/>
					<Box
						sx={{
							width: "100%",
							height: "12px",
							position: "relative",
						}}
					>
						<JunctionNodeVerticalBar
							color={borderColor}
							left={data.pivotPosition}
							selected={pivotSelected}
						/>
					</Box>
					<Box
						sx={{
							marginLeft: data.pivotPosition + "px",
							width: "1px",
							height: "12px",
							background: borderColor,
						}}
					/>
					{/* Add branch buttons */}
					{branchAddButtonsPositions.map((pos, index) => (
						<JunctionNodeBranchAddButton
							key={index}
							index={index}
							position={{ top: -10, left: pos }}
							onClick={onBranchAdd}
						/>
					))}
				</>
			)}
		</JunctionNode>
	);
};

export default JunctionAndEndNode;
