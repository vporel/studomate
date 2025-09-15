'use client'

import { Box } from "@mui/material"
import GrafcetTool from "./GrafcetTool"

const TransitionTool = ({disabled}: {disabled?: boolean}) => {
	return (
		<GrafcetTool type="transition" disabled={disabled}>
			<Box style={{
				width: "40px",
				height: "40px",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
			}}>
				<Box sx={{
					width: "1px", height: "30px",
					background: "black", position: "relative",
					"&::before": {
						content: '""',
						position: "absolute",
						width: "25px", height: "2px",
						background: "black",
						top: "50%", left: "-12.5px",
					}
				}}></Box>
			</Box>
		</GrafcetTool>
	)
}

export default TransitionTool