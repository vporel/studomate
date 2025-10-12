"use client";

import { useAppContext } from "@/components/AppContext";
import Explorer from "@/components/explorer/Explorer";
import StatusBar from "@/components/footer/StatusBar";
import AppMenuBar from "@/components/header/menu-bar/AppMenuBar";
import TitleBar from "@/components/header/TitleBar";
import { PageData } from "@/components/pages/context/pages-data";
import { PagesContextProvider } from "@/components/pages/context/PagesContext";
import PagesView from "@/components/pages/PagesView";
import { PROJECT_STARTUP_PAGE_DATA, PROJECT_STARTUP_PAGE_ID } from "@/components/pages/ProjectStartupPage";
import { useProjectContext } from "@/components/projects/ProjectContext";
import Pane from "@/lib/split-pane/Pane";
import SplitPane from "@/lib/split-pane/SplitPane";
import Project from "@/schemas/project/Project.class";
import { Box } from "@mui/material";

function getInitialPagesData(project: Project): Record<string, PageData> {
	const pagesData: Record<string, PageData> = {};
	if (Object.keys(project.grafcets).length === 0) {
		pagesData[PROJECT_STARTUP_PAGE_ID] = PROJECT_STARTUP_PAGE_DATA;
	} else {
		for (const grafcetId in project.grafcets) {
			const grafcet = project.grafcets[grafcetId];
			pagesData[grafcetId] = {
				type: "grafcet",
				title: grafcet.name,
				grafcet: grafcet,
			};
		}
	}
	return pagesData;
}

export default function App() {
	const { viewAppearance } = useAppContext();
	const { project } = useProjectContext();

	if (!project) {
		return <></>;
	}

	return (
		<PagesContextProvider initialPagesData={getInitialPagesData(project)}>
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					height: "100vh",
					overflow: "hidden",
				}}
			>
				<Box
					sx={{
						width: "100%",
						flexShrink: 0,
						display: "flex",
						alignItems: "center",
						borderBottom: "1px solid lightgray",
					}}
				>
					<Box
						component="img"
						src="/images/favicon.ico"
						sx={{ width: "40px", margin: "0 0.5rem" }}
					/>
					<Box sx={{ flex: 1, paddingTop: "5px" }}>
						<TitleBar />
						<AppMenuBar />
					</Box>
				</Box>
				<SplitPane split="vertical" sx={{ flex: 1, position: "relative", overflow: "hidden" }}>
					<Pane initialSize={200} minSize={200} maxSize={400} visible={viewAppearance.explorer}>
						<Explorer />
					</Pane>
					<Pane style={{ overflow: "hidden" }}>
						<PagesView />
					</Pane>
				</SplitPane>
				<StatusBar />
			</Box>
		</PagesContextProvider>
	);
}
