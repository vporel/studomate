'use client'

import { Box } from "@mui/material"

export const JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH = 20

const JunctionNodeBranchAddButton = ({index, position, onClick}: {index: number, position: {top: number, left: number}, onClick: (index: number) => void}) => {

	return <Box 
		component="button" 
		className="junction-node__branch__add-button" 
		sx={{
			position: "absolute",
			top: position.top+"px",
			left: (position.left-(JUNCTION_NODE_ADD_BRANCH_BUTTON_WIDTH/2))+"px",
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
				background: th => th.palette.primary.main,
				color: "white"
			}
		}}
		onClick={() => onClick(index)}
	>
		+
	</Box>
}

export default JunctionNodeAddBranchButton