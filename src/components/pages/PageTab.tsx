'use client'

import { Box, useTheme } from "@mui/material"

export type PageTabProps = {
	id: string,
	title: string,
	active?: boolean
}

const PageTab = ({id, title, active}: PageTabProps) => {
	const th = useTheme()

	return (
		<Box className="pages__tab" sx={{
			height: "100%", width: "fit-content", padding: "10px",
			display: "flex", alignItems: "center", justifyContent: "center",
			cursor: "pointer", userSelect: "none",
			transition: "all .2s ease",
			borderRadius: "5px 5px 0px 0px",
			position: "relative",
			backgroundColor: !active ? "white" : th.palette.primary.main,
			color: !active ? th.palette.text.primary : "white",
			":hover": {
				backgroundColor: "#dfdfdf",
				color: th.palette.text.primary,
				borderColor: th.palette.primary.main,
			},
		}}>
			<span>{title}</span>
		</Box>
	)
}

export default PageTab