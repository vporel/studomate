"use client";

import StatusBar from "@/components/footer/StatusBar";
import GrafcetToolbar from "@/components/grafcet/toolbar/GrafcetToolbar";
import { GrafcetToolbarDnDProvider } from "@/components/grafcet/toolbar/GrafcetToolbarDnDContext";
import AppMenuBar from "@/components/header/menu-bar/AppMenuBar";
import TitleBar from "@/components/header/TitleBar";
import { PagesContextProvider } from "@/components/pages/PagesContext";
import PagesTabBar from "@/components/pages/PagesTabBar";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { Box } from "@mui/material";
import GrafcetPage from "../components/grafcet/flow/GrafcetPage";

export default function App() {
	const { project } = useProjectContext();

	return (
		<PagesContextProvider
			initialPagesData={{
				page1: {
					type: "grafcet",
					title: "Grafcet 1",
					hasUnsavedChanges: false,
				},
				page2: {
					type: "grafcet",
					title: "Grafcet 2",
					hasUnsavedChanges: false,
				},
			}}
		>
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
					<Box component="img" src="./favicon.ico" sx={{ width: "40px", margin: "0 0.5rem" }} />
					<Box sx={{ flex: 1, paddingTop: "5px" }}>
						<TitleBar />
						<AppMenuBar />
					</Box>
				</Box>
				<Box
					sx={{
						width: "100%",
						display: "flex",
						flex: 1,
						position: "relative",
						overflow: "hidden",
					}}
				>
					{/* <ActivityToolbar /> */}
					<Box
						sx={{
							height: "100%",
							display: "flex",
							flex: 1,
							flexDirection: "column",
							position: "relative",
						}}
					>
						<PagesTabBar />
						<GrafcetToolbarDnDProvider>
							<GrafcetToolbar />
							<GrafcetPage grafcetId="page1" />
						</GrafcetToolbarDnDProvider>
					</Box>
				</Box>
				<StatusBar />
			</Box>
		</PagesContextProvider>
	);
}
