"use client";
import { useTheme } from "@mui/material";
import { NodeProps } from "@xyflow/react";
import { type FC } from "react";
import JunctionBarsRow from "./JunctionBarsRow";
import JunctionHorizontalBar from "./JunctionHorizontalBar";
import JunctionNode, { JunctionNodeType } from "./JunctionNode";
import JunctionNodeBranchAddButtons from "./JunctionNodeBranchAddButtons";

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
			<JunctionBarsRow data={data} color={borderColor} height="14px" pivot />
			<JunctionHorizontalBar color={borderColor} thickness="2px" />
			<JunctionBarsRow data={data} color={borderColor} height="14px" />
			<JunctionNodeBranchAddButtons top={20} />
		</JunctionNode>
	);
};

export default JunctionOrStartNode;
