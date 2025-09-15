'use client'

import React from "react"
import StepTool from "./StepTool"
import SourceArrowTool from "./SourceArrowTool"
import DestinationArrowTool from "./DestinationArrowTool"
import ActionTool from "./ActionTool"
import TransitionTool from "./TransitionTool"
import OrJunctionStartTool from "./OrJunctionStartTool"
import AndJunctionStartTool from "./AndJunctionStartTool"
import OrJunctionEndTool from "./OrJunctionEndTool"
import AndJunctionEndTool from "./AndJunctionEndTool"
import { Box, Grid } from "@mui/material"

const GrafcetToolbar = ({style}: {style?: React.CSSProperties}) => {

	return (
		<div className="grafcet-toolbar" style={{
			height: "100%", width: "200px",
			borderRight: "1px solid lightgray",
			backgroundColor: "#efefef",
			padding:"10px",
			...style
		}}>
			<Grid container spacing={1}>
				<Grid size={3}><Box><StepTool /></Box></Grid>
				<Grid size={6}><Box><ActionTool /></Box></Grid>
				<Grid size={3}><Box><TransitionTool /></Box></Grid>
				<Grid size={3}><Box><OrJunctionStartTool /></Box></Grid>
				<Grid size={3}><Box><OrJunctionEndTool /></Box></Grid>
				<Grid size={3}><Box><AndJunctionStartTool /></Box></Grid>
				<Grid size={3}><Box><AndJunctionEndTool /></Box></Grid>
				<Grid size={3}><Box><SourceArrowTool /></Box></Grid>
				<Grid size={3}><Box><DestinationArrowTool /></Box></Grid>
			</Grid>
		</div>
	)
}

export default GrafcetToolbar