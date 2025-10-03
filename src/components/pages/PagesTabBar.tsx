"use client";

import { Box } from "@mui/material";
import PageTab, { PageTabProps } from "./PageTab";

const PagesTabBar = ({ tabsData }: { tabsData?: Array<PageTabProps> }) => {
	return (
		<Box
			className="pages__tab-bar"
			sx={{
				width: "100%",
				height: "35px",
				display: "flex",
				alignItems: "center",
			}}
		>
			{tabsData?.map((tabData) => (
				<PageTab key={tabData.id} {...tabData} />
			))}
		</Box>
	);
};

export default PagesTabBar;
