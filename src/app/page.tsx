"use client";

import { AppContextProvider } from "@/ui/components/AppContext";
import AppStartup from "@/ui/components/AppStartup";
import {
	ProjectContextProvider,
	useProjectStore,
} from "@/ui/components/projects/ProjectContext";
import { Box, CircularProgress } from "@mui/material";
import dynamic from "next/dynamic";

// Charge l'éditeur (React Flow, DataGrid, TreeView) uniquement à l'ouverture d'un projet :
// l'écran de démarrage n'embarque pas ces librairies.
const AppShell = dynamic(() => import("@/ui/components/AppShell"), {
	ssr: false,
	loading: () => (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
			}}
		>
			<CircularProgress />
		</Box>
	),
});

function AppComponent() {
	const projectOpened = useProjectStore((state) => !!state.project);

	if (!projectOpened) {
		return <AppStartup />;
	}

	return <AppShell />;
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
