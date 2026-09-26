"use client";
import { useTheme } from "@mui/material";
import { NodeProps } from "@xyflow/react";
import { type FC } from "react";
import JunctionBarsRow from "./JunctionBarsRow";
import JunctionHorizontalBar from "./JunctionHorizontalBar";
import JunctionNode, { JunctionNodeType } from "./JunctionNode";
import JunctionNodeBranchAddButtons from "./JunctionNodeBranchAddButtons";

export type JunctionAndStartNodeType = JunctionNodeType & {
	type: "junction-and-start";
};

export type JunctionAndStartNodeProps = NodeProps<JunctionAndStartNodeType>;

const JunctionAndStartNode: FC<JunctionAndStartNodeProps> = (props) => {
	const { data, selected } = props;
	const th = useTheme();
	const borderColor = selected ? th.palette.primary.main : "black";

	return (
		<JunctionNode
			orientation="start"
			className="junction-and-start-node"
			{...props}
		>
			<JunctionBarsRow data={data} color={borderColor} height="12px" pivot />
			<JunctionHorizontalBar color={borderColor} thickness="1px" />
			<JunctionHorizontalBar
				color={borderColor}
				thickness="1px"
				marginTop="3px"
			/>
			<JunctionBarsRow data={data} color={borderColor} height="13px" />
			<JunctionNodeBranchAddButtons top={20} />
		</JunctionNode>
	);
};

export default JunctionAndStartNode;
