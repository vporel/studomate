"use client";

import { HomeOutlined as HomeIcon } from "@mui/icons-material";
import { PROJECT_STARTUP_PAGE_DATA } from "../pages/ProjectStartupPage";
import { useProjectStore } from "../projects/ProjectContext";
import AppTool from "./AppTool";

const HomeTool = () => {
	const openPage = useProjectStore((state) => state.openPage);

	return (
		<AppTool
			name="home"
			onClick={() => {
				openPage(PROJECT_STARTUP_PAGE_DATA);
			}}
		>
			<HomeIcon />
		</AppTool>
	);
};

export default HomeTool;
