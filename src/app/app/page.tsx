"use client";

import { LocaleProvider } from "@/ui/i18n/LocaleProvider";
import { AppContextProvider } from "@/ui/components/AppContext";
import AppStartup from "@/ui/components/AppStartup";
import FullScreenLoader from "@/ui/components/FullScreenLoader";
import {
	ProjectContextProvider,
	useProjectStore,
} from "@/ui/components/projects/ProjectContext";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Charge l'éditeur (React Flow, DataGrid, TreeView) uniquement à l'ouverture d'un projet :
// l'écran de démarrage n'embarque pas ces librairies.
const AppShell = dynamic(() => import("@/ui/components/AppShell"), {
	ssr: false,
	loading: () => <FullScreenLoader />,
});

function AppComponent() {
	const projectOpened = useProjectStore((state) => !!state.project);
	const restoring = useProjectStore((state) => state.bootStatus === "restoring");

	// `bootStatus` dépend de l'URL, indisponible au rendu serveur : on rend d'abord la sortie
	// prérendue (page de démarrage), le splash pré-hydratation couvrant l'écran le temps que ce
	// premier rendu client passe. La bascule vers le loader se fait juste après le montage.
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
		// Le splash pré-hydratation (voir layout + globals.css) a joué son rôle : React prend la main.
		// On retire seulement la classe qui le rend visible — le nœud `#boot-splash` reste géré par
		// React (le retirer du DOM ici casse le démontage lors d'une navigation client hors de /app).
		document.documentElement.classList.remove("restoring");
	}, []);

	if (!mounted) {
		return <AppStartup />;
	}

	if (projectOpened) {
		return <AppShell />;
	}

	if (restoring) {
		return <FullScreenLoader />;
	}

	return <AppStartup />;
}

export default function App() {
	return (
		<LocaleProvider>
			<AppContextProvider>
				<ProjectContextProvider>
					<AppComponent />
				</ProjectContextProvider>
			</AppContextProvider>
		</LocaleProvider>
	);
}
