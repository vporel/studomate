"use client";

/**
 * Le canvas HMI est une <div> positionnée absolument, pas un ReactFlow.
 *
 * ReactFlow est conçu pour des graphes (nœuds + arêtes). Une HMI ne contient
 * que des widgets indépendants sans connexions entre eux : utiliser ReactFlow
 * apporterait un overhead conceptuel (nodes, edges, handles, ReactFlowProvider)
 * sans aucun bénéfice, et introduirait une dépendance superflue dans un contexte
 * où la couche graphique n'a besoin que de positionnement absolu, de drag et de zoom.
 */

import HmiPage from "@/schemas/hmi/hmi-page.schema";
import { HmiContextProvider } from "./HmiContext";
import { HmiWidgetDnDProvider } from "./toolbar/HmiWidgetDnDContext";
import HmiPageContent from "./view/HmiPageContent";

const HmiPageView = ({
	initialHmiPage,
	tabPageId,
	isSimulation,
}: {
	initialHmiPage: HmiPage;
	tabPageId?: string;
	isSimulation?: boolean;
}) => (
	<HmiContextProvider initialHmiPage={initialHmiPage}>
		<HmiWidgetDnDProvider>
			<HmiPageContent
				hmiPageId={initialHmiPage.id}
				tabPageId={tabPageId}
				isSimulation={isSimulation}
			/>
		</HmiWidgetDnDProvider>
	</HmiContextProvider>
);

export default HmiPageView;
