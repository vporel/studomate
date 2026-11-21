"use client";

import BottomPanel, {
	useActiveBottomPanelTab,
} from "@/ui/components/bottom-panel/BottomPanel";
import Explorer from "@/ui/components/explorer/Explorer";
import StatusBar from "@/ui/components/footer/StatusBar";
import AppMenuBar from "@/ui/components/header/menu-bar/AppMenuBar";
import TitleBar from "@/ui/components/header/title-bar/TitleBar";
import AppTour from "@/ui/components/product-tour/app-tour/AppTour";
import PagesView from "@/ui/components/pages/PagesView";
import SidePanel, {
	useSidePanelContent,
} from "@/ui/components/side-panel/SidePanel";
import {
	getSidePanelWidth,
	setSidePanelWidth,
} from "@/persistence/preferences.storage";
import { useAppContext } from "@/ui/components/AppContext";
import Pane from "@/ui/lib/split-pane/Pane";
import SplitPane from "@/ui/lib/split-pane/SplitPane";
import { Box } from "@mui/material";
import dynamic from "next/dynamic";
import { useState } from "react";

//Three.js and WebGL are loaded when the scene is first shown.
const Scene3dFloatingBox = dynamic(
	() => import("@/ui/components/3d-scene/Scene3dFloatingBox"),
	{ ssr: false },
);

const DEFAULT_SIDE_PANEL_WIDTH = 400;
const DEFAULT_BOTTOM_PANEL_HEIGHT = 300;
const MIN_BOTTOM_PANEL_HEIGHT = 120;
const MIN_EDITORS_HEIGHT = 200;

const AppShell = () => {
	const { viewAppearance } = useAppContext();
	const sidePanel = useSidePanelContent();
	const bottomPanelTab = useActiveBottomPanelTab();
	const [sidePanelWidth, setSidePanelWidthState] = useState(
		() => getSidePanelWidth() ?? DEFAULT_SIDE_PANEL_WIDTH,
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
					<SplitPane split="horizontal">
						<Pane minSize={MIN_EDITORS_HEIGHT} style={{ overflow: "hidden" }}>
							<SplitPane split="vertical">
								<Pane style={{ overflow: "hidden" }}>
									<Box sx={{ position: "relative", height: "100%" }}>
										<PagesView />
										<Scene3dFloatingBox />
									</Box>
								</Pane>
								<Pane
									initialSize={sidePanelWidth}
									minSize={300}
									//The 3D scene needs more room than the watch tables alone.
									maxSize={sidePanel.scene3d ? "50%" : 600}
									visible={sidePanel.scene3d || sidePanel.watchTables}
									style={{ overflow: "hidden" }}
									onSizeChange={({ px }) => {
										setSidePanelWidthState(px);
										setSidePanelWidth(px);
									}}
								>
									<SidePanel />
								</Pane>
							</SplitPane>
						</Pane>
						<Pane
							initialSize={DEFAULT_BOTTOM_PANEL_HEIGHT}
							minSize={MIN_BOTTOM_PANEL_HEIGHT}
							maxSize="70%"
							visible={bottomPanelTab !== null}
							style={{ overflow: "hidden" }}
						>
							<BottomPanel />
						</Pane>
					</SplitPane>
				</Pane>
			</SplitPane>
			<StatusBar />
			<AppTour />
		</Box>
	);
};

export default AppShell;
