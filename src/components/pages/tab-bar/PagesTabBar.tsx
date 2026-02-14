"use client";

import { useProjectStore } from "@/components/projects/ProjectContext";
import { Box } from "@mui/material";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import PageTab, { PageTabProps } from "./PageTab";

const PagesTabBar = () => {
	const { pagesData } = useProjectStore(
		useShallow((state) => ({
			pagesData: state.pagesData,
		})),
	);

	const tabsData: PageTabProps[] = useMemo(
		() =>
			Object.keys(pagesData).map((id) => ({
				id,
				title: pagesData[id].title,
				type: pagesData[id].type,
			})),
		[pagesData],
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
				backgroundColor: "white",
			}}
		>
			{tabsData?.map((tabData) => (
				<PageTab key={tabData.id} {...tabData} />
			))}
		</Box>
	);
};

export default PagesTabBar;
