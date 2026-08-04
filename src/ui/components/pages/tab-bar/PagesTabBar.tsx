"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { Box } from "@mui/material";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import PageTab, { PageTabProps } from "./PageTab";

const PagesTabBar = () => {
	const { pagesData, pagesOrder } = useProjectStore(
		useShallow((state) => ({
			pagesData: state.pagesData,
			pagesOrder: state.pagesOrder,
		})),
	);

	//L'ordre vient de `pagesOrder`, pas de l'ordre d'insertion des clés de `pagesData` :
	//c'est ce qui rend l'ordre des onglets explicite et donc réordonnable
	const tabsData: PageTabProps[] = useMemo(
		() =>
			pagesOrder
				.filter((id) => !!pagesData[id])
				.map((id) => ({
					id,
					title: pagesData[id].title,
					type: pagesData[id].type,
				})),
		[pagesData, pagesOrder],
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
