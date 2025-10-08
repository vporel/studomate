"use client";

import { Box } from "@mui/material";
import { useMemo } from "react";
import PageTab, { PageTabProps } from "./PageTab";
import { usePagesContext } from "./PagesContext";

const PagesTabBar = () => {
	const { pagesData } = usePagesContext();

	const tabsData: PageTabProps[] = useMemo(
		() =>
			Object.keys(pagesData).map((id) => ({
				id,
				title: pagesData[id].title,
				active: pagesData[id].active,
				hasUnsavedChanges: pagesData[id].hasUnsavedChanges,
			})),
		[pagesData]
	);

	return (
		<Box
			className="pages__tab-bar"
			sx={{
				width: "100%",
				height: "35px",
				display: "flex",
				alignItems: "center",
				borderBottom: "1px solid lightgray",
			}}
		>
			{tabsData?.map((tabData) => (
				<PageTab key={tabData.id} {...tabData} />
			))}
		</Box>
	);
};

export default PagesTabBar;
