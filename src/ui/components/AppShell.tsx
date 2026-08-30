"use client";

import Explorer from "@/ui/components/explorer/Explorer";
import StatusBar from "@/ui/components/footer/StatusBar";
import AppMenuBar from "@/ui/components/header/menu-bar/AppMenuBar";
import TitleBar from "@/ui/components/header/title-bar/TitleBar";
import PagesView from "@/ui/components/pages/PagesView";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import WatchTables from "@/ui/components/watch-tables/WatchTables";
import { useAppContext } from "@/ui/components/AppContext";
import Pane from "@/ui/lib/split-pane/Pane";
import SplitPane from "@/ui/lib/split-pane/SplitPane";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Box } from "@mui/material";
import { useShallow } from "zustand/shallow";

const AppShell = () => {
	const { viewAppearance } = useAppContext();
	const { watchTablesVisible, mode } = useProjectStore(
		useShallow((state) => ({
			watchTablesVisible: state.ui.watchTablesVisible,
			mode: state.mode,
		})),
	);

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
				<Box
					component="img"
					src="/images/icon.png"
					alt=""
					sx={{ width: "50px", margin: "10px" }}
				/>
				<Box sx={{ flex: 1, paddingTop: "5px" }}>
					<TitleBar />
					<AppMenuBar />
				</Box>
			</Box>
			<SplitPane
				split="vertical"
				sx={{ flex: 1, position: "relative", overflow: "hidden" }}
			>
				<Pane
					initialSize={250}
					minSize={200}
					maxSize={400}
					visible={viewAppearance.explorer}
				>
					<Explorer />
				</Pane>
				<Pane style={{ overflow: "hidden" }}>
					<PagesView />
				</Pane>
				<Pane
					initialSize={350}
					minSize={300}
					maxSize={600}
					visible={watchTablesVisible && mode === ProjectMode.SIMULATION}
				>
					<WatchTables />
				</Pane>
			</SplitPane>
			<StatusBar />
		</Box>
	);
};

export default AppShell;
