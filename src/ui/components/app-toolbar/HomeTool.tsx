"use client";

import HomeIcon from "@mui/icons-material/HomeOutlined";
import { PROJECT_STARTUP_PAGE_DATA } from "../pages/ProjectStartupPage";
import { useProjectStore } from "../projects/ProjectContext";
import AppTool from "./AppTool";

const HomeTool = () => {
	const pagesManager = useProjectStore((state) => state.pagesManager);

	return (
		<AppTool
			name="home"
			label="Accueil"
			onClick={() => {
				pagesManager.openPage(PROJECT_STARTUP_PAGE_DATA);
			}}
		>
			<HomeIcon />
		</AppTool>
	);
};

export default HomeTool;
