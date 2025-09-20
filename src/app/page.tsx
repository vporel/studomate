'use client'

import GrafcetPage from "../components/grafcet/GrafcetPage";
import GrafcetToolbar from "@/components/grafcet/toolbar/GrafcetToolbar";
import PagesTabBar from "@/components/pages/PagesTabBar";
import { Box } from "@mui/material";
import MenuBar from "@/components/menu/MenuBar";
import StatusBar from "@/components/StatusBar";
import { Position } from "@xyflow/react";
import GrafcetToolbarDnDContext, { GrafcetToolbarDnDProvider } from "@/components/grafcet/toolbar/GrafcetToolbarDnDContext";
import { ProjectContextProvider, useProjectContext } from "@/components/projects/ProjectContext";
import { PagesContextProvider } from "@/PagesContext";

export default function App() {
	const {project} = useProjectContext()

	return (
        <PagesContextProvider>
			<div style={{
				display: "flex", flexDirection: "column",
				height: "100vh", overflow: "hidden",
			}}>
				<MenuBar />
				<Box sx={{
					width: "100%",
					display: "flex", flex: 1,
					position: "relative", overflow: "hidden",
				}}>
					<GrafcetToolbarDnDProvider>
						<GrafcetToolbar />
						<Box className="pages__container" sx={{
							height: "100%", display: "flex", flex: 1, flexDirection: "column",
							position: "relative",
						}}>
							<PagesTabBar tabsData={[
								{id: "xx", title: "Grafcet 1", active: true},
								{id: "yy", title: "Grafcet 2"},
							]}/>
							<GrafcetPage grafcetId="page-1"/>
						</Box>
					</GrafcetToolbarDnDProvider>
				</Box>
				<StatusBar />
			</div>
		</PagesContextProvider>
	)
}
