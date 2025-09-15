'use client'

import { Box } from "@mui/material"
import GrafcetTool from "./GrafcetTool"

const OrJunctionEndTool = ({disabled}: {disabled?: boolean}) => {
	return (
		<GrafcetTool type="or-junction-end" disabled={disabled}>
			<Box sx={{
				width: "40px", height: "40px",
				display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
			}}>
				<Box sx={{width: "100%", height: "5px", position: "relative"}}>
					<Box sx={{width: "1px", height: "100%", background: "black", position: "absolute", left: "5%"}}/>
					<Box sx={{width: "1px", height: "100%", background: "black", position: "absolute", left: "90%"}}/>
				</Box>
				<Box sx={{width: "100%", height: "1px", background: "black"}} />
				<Box sx={{width: "1px", height: "5px", background: "black"}} />
				
			</Box>
		</GrafcetTool>
	)
}

export default OrJunctionEndTool