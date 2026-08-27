"use client";
import { Box } from "@mui/material";
import { useJunctionNodeContext } from "./context/JunctionNodeContext";

const JunctionNodeVerticalBar = ({
	color,
	left,
	pivot,
	branchId,
}: {
	color: string;
	left: number;
	pivot: boolean;
	branchId?: string;
}) => {
	const { pivotSelected, selectedBranchId, selectBranch, selectPivot } =
		useJunctionNodeContext();
	const selected =
		(pivot && pivotSelected) || (!pivot && selectedBranchId === branchId);

	return (
		<>
			<Box
				component="div"
				sx={{
					position: "absolute",
					width: selected ? "4px" : "1px",
					background: selected ? "red" : color,
					height: "100%",
					left: (selected ? left - 2 : left - 0.5) + "px",
				}}
				onClick={(e) => {
					e.stopPropagation();
					if (pivot) selectPivot();
					else if (branchId) selectBranch(branchId);
				}}
			/>
		</>
	);
};

export default JunctionNodeVerticalBar;
