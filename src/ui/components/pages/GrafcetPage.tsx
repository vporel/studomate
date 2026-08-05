"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { useProjectStore } from "../projects/ProjectContext";
import { GrafcetContextProvider } from "../grafcet/context/GrafcetContext";
import GrafcetFlow from "../grafcet/flow/GrafcetFlow";
import GrafcetToolbar from "../grafcet/toolbar/GrafcetToolbar";
import { GrafcetToolbarDnDProvider } from "../grafcet/toolbar/GrafcetToolbarDnDContext";
import Page from "./Page";

const GrafcetPage = ({ initialGrafcet }: { initialGrafcet: Grafcet }) => {
	//`Page` only hides inactive tabs with display:none — React Flow would stay mounted and
	//keep re-rendering on every store update (e.g. each simulation cycle) for every open
	//grafcet, visible or not. Unmounting it here avoids that cost; the grafcet's own state
	//(nodes, edges, viewport...) lives in its zustand store, not in GrafcetFlow, so nothing is
	//lost when it remounts on the next tab switch.
	const isActive = useProjectStore((state) => state.activePageId === initialGrafcet.id);

	return (
		<Page pageId={initialGrafcet.id} sx={{ flexDirection: "column", paddingBottom: 4 }}>
			<GrafcetContextProvider initialGrafcet={initialGrafcet}>
				<GrafcetToolbarDnDProvider>
					<GrafcetToolbar />
					{isActive && <GrafcetFlow />}
				</GrafcetToolbarDnDProvider>
			</GrafcetContextProvider>
		</Page>
	);
};

export default GrafcetPage;
