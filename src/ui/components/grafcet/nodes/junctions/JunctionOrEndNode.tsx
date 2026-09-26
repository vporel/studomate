"use client";
import { useTheme } from "@mui/material";
import { NodeProps } from "@xyflow/react";
import { type FC } from "react";
import JunctionBarsRow from "./JunctionBarsRow";
import JunctionHorizontalBar from "./JunctionHorizontalBar";
import JunctionNode, { JunctionNodeType } from "./JunctionNode";
import JunctionNodeBranchAddButtons from "./JunctionNodeBranchAddButtons";

export type JunctionOrEndNodeType = JunctionNodeType & {
	type: "junction-or-end";
};

export type JunctionOrEndNodeProps = NodeProps<JunctionOrEndNodeType>;

const JunctionOrEndNode: FC<JunctionOrEndNodeProps> = (props) => {
	const { data, selected } = props;
	const th = useTheme();
	const borderColor = selected ? th.palette.primary.main : "black";

	return (
		<JunctionNode orientation="end" className="junction-or-end-node" {...props}>
			<JunctionBarsRow data={data} color={borderColor} height="14px" />
			<JunctionHorizontalBar color={borderColor} thickness="2px" />
			<JunctionBarsRow data={data} color={borderColor} height="14px" pivot />
			<JunctionNodeBranchAddButtons top={-10} />
		</JunctionNode>
	);
};

export default JunctionOrEndNode;
