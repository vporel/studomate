"use client";

import HomeIcon from "@mui/icons-material/HomeOutlined";
import { PROJECT_STARTUP_PAGE_DATA } from "../pages/ProjectStartupPage";
import { useProjectStore } from "../projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import AppTool from "./AppTool";

const HomeTool = () => {
	const t = useT("chrome.toolbar");
	const pagesManager = useProjectStore((state) => state.pagesManager);

	return (
		<AppTool
			name="home"
			label={t("home")}
			onClick={() => {
				pagesManager.openPage(PROJECT_STARTUP_PAGE_DATA);
			}}
		>
			<HomeIcon />
		</AppTool>
	);
};

export default HomeTool;
