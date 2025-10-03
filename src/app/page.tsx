"use client";

import StatusBar from "@/components/footer/StatusBar";
import GrafcetToolbar from "@/components/grafcet/toolbar/GrafcetToolbar";
import { GrafcetToolbarDnDProvider } from "@/components/grafcet/toolbar/GrafcetToolbarDnDContext";
import MenuBar from "@/components/header/menu/MenuBar";
import TitleBar from "@/components/header/TitleBar";
import PagesTabBar from "@/components/pages/PagesTabBar";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { PagesContextProvider } from "@/PagesContext";
import { Box } from "@mui/material";
import GrafcetPage from "../components/grafcet/flow/GrafcetPage";

export default function App() {
	const { project } = useProjectContext();

	return (
		<PagesContextProvider>
			<div
				style={{
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
						<MenuBar />
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
					<GrafcetToolbarDnDProvider>
						<GrafcetToolbar />
						<Box
							className="pages__container"
							sx={{
								height: "100%",
								display: "flex",
								flex: 1,
								flexDirection: "column",
								position: "relative",
							}}
						>
							<PagesTabBar
								tabsData={[
									{
										id: "xx",
										title: "Grafcet 1",
										active: true,
										hasChanges: true,
									},
									{ id: "yy", title: "Grafcet 2" },
									{ id: "zz", title: "Grafcet 3" },
								]}
							/>
							<GrafcetPage grafcetId="page-1" />
						</Box>
					</GrafcetToolbarDnDProvider>
				</Box>
				<StatusBar />
			</div>
		</PagesContextProvider>
	);
}
