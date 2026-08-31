"use client";

import { Box } from "@mui/material";
import { useJunctionNodeContext } from "./context/JunctionNodeContext";

export const JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH = 20;

const JunctionNodeBranchAddButton = ({
	insertIndex,
	position,
	onClick,
}: {
	insertIndex: number;
	position: { top: number; left: number };
	onClick: (insertIndex: number) => void;
}) => {
	return (
		<Box
			component="button"
			className="junction-node__add-branch-button"
			sx={{
				position: "absolute",
				top: position.top + "px",
				left: position.left - JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH / 2 + "px",
				padding: "0px",
				width: "20px!important",
				height: "20px!important",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				cursor: "pointer",
				borderRadius: "100%",
				background: "rgb(240, 240, 240)",
				transition: "all .2s ease",
				"&:hover": {
					background: (th) => th.palette.primary.main,
					color: "white",
				},
			}}
			onClick={() => onClick(insertIndex)}
		>
			+
		</Box>
	);
};

const JunctionNodeBranchAddButtons = ({ top }: { top: number }) => {
	const { branchAddButtonsPositions, onBranchAdd } = useJunctionNodeContext();

	return branchAddButtonsPositions.map((button) => (
		<JunctionNodeBranchAddButton
			key={button.insertIndex}
			insertIndex={button.insertIndex}
			position={{ top, left: button.left }}
			onClick={onBranchAdd}
		/>
	));
};

export default JunctionNodeBranchAddButtons;
