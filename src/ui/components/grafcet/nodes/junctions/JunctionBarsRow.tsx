"use client";
import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { Box } from "@mui/material";
import JunctionNodeVerticalBar from "./JunctionNodeVerticalBar";

type JunctionBarsRowProps = {
	data: JunctionData;
	color: string;
	height: string;
	pivot?: boolean;
};

/** Rangée des barres verticales d'une jonction : la barre du pivot avec `pivot`, sinon une
 * barre par branche. */
const JunctionBarsRow = ({
	data,
	color,
	height,
	pivot = false,
}: JunctionBarsRowProps) => (
	<Box sx={{ width: "100%", height, position: "relative" }}>
		{pivot ? (
			<JunctionNodeVerticalBar
				color={color}
				left={data.pivotPosition}
				pivot={true}
			/>
		) : (
			data.branchesOrder.map((branchId) => (
				<JunctionNodeVerticalBar
					key={branchId}
					color={color}
					left={data.branches[branchId]!.position}
					pivot={false}
					branchId={branchId}
				/>
			))
		)}
	</Box>
);

export default JunctionBarsRow;
