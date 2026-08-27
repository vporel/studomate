"use client";
import { Box, useTheme } from "@mui/material";
import { NodeProps } from "@xyflow/react";
import { type FC } from "react";
import JunctionNode, { JunctionNodeType } from "./JunctionNode";
import JunctionNodeBranchAddButtons from "./JunctionNodeBranchAddButtons";
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
			<Box
				sx={{
					width: "100%",
					height: "14px",
					position: "relative",
				}}
			>
				<JunctionNodeVerticalBar
					color={borderColor}
					left={data.pivotPosition}
					pivot={true}
				/>
			</Box>
			<Box
				sx={{
					width: "100%",
					height: "2px",
					background: borderColor,
				}}
			/>
			<Box
				sx={{
					width: "100%",
					height: "14px",
					position: "relative",
				}}
			>
				{data.branchesOrder.map((branchId) => (
					<JunctionNodeVerticalBar
						key={branchId}
						color={borderColor}
						left={data.branches[branchId]!.position}
						pivot={false}
						branchId={branchId}
					/>
				))}
			</Box>
			<JunctionNodeBranchAddButtons top={20} />
		</JunctionNode>
	);
};

export default JunctionOrStartNode;
