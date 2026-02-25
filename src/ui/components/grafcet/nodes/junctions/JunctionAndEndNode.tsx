"use client";
import { Box, useTheme } from "@mui/material";
import { NodeProps } from "@xyflow/react";
import { type FC } from "react";
import JunctionNode, { JunctionNodeType } from "./JunctionNode";
import JunctionNodeBranchAddButtons from "./JunctionNodeBranchAddButtons";
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
		<JunctionNode orientation="end" className="junction-and-end-node" {...props}>
			<Box
				sx={{
					width: "100%",
					height: "13px",
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
				<JunctionNodeVerticalBar color={borderColor} left={data.pivotPosition} pivot={true} />
			</Box>
			<Box
				sx={{
					marginLeft: data.pivotPosition + "px",
					width: "1px",
					height: "12px",
					background: borderColor,
				}}
			/>
			<JunctionNodeBranchAddButtons top={-10} />
		</JunctionNode>
	);
};

export default JunctionAndEndNode;
