"use client";

import { AppContextProvider, useAppContext } from "@/components/AppContext";
import AppStartup from "@/components/AppStartup";
import Explorer from "@/components/explorer/Explorer";
import StatusBar from "@/components/footer/StatusBar";
import AppMenuBar from "@/components/header/menu-bar/AppMenuBar";
import TitleBar from "@/components/header/TitleBar";
import PagesView from "@/components/pages/PagesView";
import { ProjectContextProvider, useProjectStore } from "@/components/projects/ProjectContext";
import Pane from "@/lib/split-pane/Pane";
import SplitPane from "@/lib/split-pane/SplitPane";
import { Box } from "@mui/material";
import { useShallow } from "zustand/shallow";

function AppComponent() {
	const { viewAppearance } = useAppContext();
	const { projectOpened } = useProjectStore(
		useShallow((state) => ({
			projectOpened: !!state.project,
		})),
	);

	if (!projectOpened) {
		return <AppStartup />;
	}

	return (
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
				<Box component="img" src="/images/icon.png" sx={{ width: "50px", margin: "10px" }} />
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
	);
}

export default function App() {
	return (
		<AppContextProvider>
			<ProjectContextProvider>
				<AppComponent />
			</ProjectContextProvider>
		</AppContextProvider>
	);
}
