"use client";
import { Box, useTheme } from "@mui/material";
import { NodeProps } from "@xyflow/react";
import { type FC } from "react";
import JunctionBarsRow from "./JunctionBarsRow";
import JunctionHorizontalBar from "./JunctionHorizontalBar";
import JunctionNode, { JunctionNodeType } from "./JunctionNode";
import JunctionNodeBranchAddButtons from "./JunctionNodeBranchAddButtons";

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
			<JunctionBarsRow data={data} color={borderColor} height="13px" />
			<JunctionHorizontalBar color={borderColor} thickness="1px" />
			<JunctionHorizontalBar
				color={borderColor}
				thickness="1px"
				marginTop="3px"
			/>
			<JunctionBarsRow data={data} color={borderColor} height="12px" pivot />
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
