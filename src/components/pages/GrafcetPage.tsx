"use client";

import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetFlow from "../grafcet/flow/GrafcetFlow";
import GrafcetToolbar from "../grafcet/toolbar/GrafcetToolbar";
import { GrafcetToolbarDnDProvider } from "../grafcet/toolbar/GrafcetToolbarDnDContext";
import Page from "./Page";

const GrafcetPage = ({ initialGrafcet }: { initialGrafcet: Grafcet }) => {
	return (
		<Page pageId={initialGrafcet.id} sx={{ flexDirection: "column", paddingBottom: 4 }}>
			<GrafcetToolbarDnDProvider>
				<GrafcetToolbar />
				<GrafcetFlow initialGrafcet={initialGrafcet} />
			</GrafcetToolbarDnDProvider>
		</Page>
	);
};

export default GrafcetPage;
