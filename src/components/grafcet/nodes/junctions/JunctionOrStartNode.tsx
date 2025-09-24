"use client";
import { Box, useTheme } from "@mui/material";
import { NodeProps } from "@xyflow/react";
import { type FC } from "react";
import JunctionNode, { JunctionNodeType } from "./JunctionNode";
import JunctionNodeBranchAddButton from "./JunctionNodeBranchAddButton";
import JunctionNodeVerticalBar from "./JunctionNodeVerticalBar";

export type JunctionOrStartNodeType = JunctionNodeType & {
	type: "junction-or-start";
};

export type JunctionOrStartNodeProps = NodeProps<JunctionOrStartNodeType>;

const JunctionOrStartNode: FC<JunctionOrStartNodeProps> = (props) => {
	const { data, selected } = props;
	const th = useTheme();
	const borderColor = selected ? th.palette.primary.main : "black";

	return (
		<JunctionNode
			orientation="start"
			className="junction-or-start-node"
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
						<JunctionNodeVerticalBar
							color={borderColor}
							left={data.pivotPosition}
							selected={pivotSelected}
						/>
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
					{/* Add branch buttons */}
					{branchAddButtonsPositions.map((pos, index) => (
						<JunctionNodeBranchAddButton
							key={index}
							index={index}
							position={{ top: 20, left: pos }}
							onClick={onBranchAdd}
						/>
					))}
				</>
			)}
		</JunctionNode>
	);
};

export default JunctionOrStartNode;
