'use client'

import { Fragment } from "react"
import PageTab, { PageTabProps } from "./PageTab"
import { Box } from "@mui/material"

const PagesTabBar = ({tabsData}: {
	tabsData?: Array<PageTabProps>
}) => {
	return (
		<Box className="pages__tab-bar" sx={{
			width: "100%", height: "40px",
			display: "flex", alignItems: "center",
			padding: "5px 10px 0px 10px"
		}}>
			{tabsData?.map((tabData) => <PageTab key={tabData.id} {...tabData} />)}
		</Box>
	)
}

export default PagesTabBar