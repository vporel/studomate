"use client";

import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetFlow from "../grafcet/flow/GrafcetFlow";
import GrafcetToolbar from "../grafcet/toolbar/GrafcetToolbar";
import { GrafcetToolbarDnDProvider } from "../grafcet/toolbar/GrafcetToolbarDnDContext";
import Page from "./Page";

const GrafcetPage = ({ grafcetId, initialGrafcet }: { grafcetId: string; initialGrafcet: Grafcet }) => {
	return (
		<Page pageId={grafcetId} sx={{ flexDirection: "column", paddingBottom: 4 }}>
			<GrafcetToolbarDnDProvider>
				<GrafcetToolbar />
				<GrafcetFlow grafcetId={grafcetId} initialGrafcet={initialGrafcet} />
			</GrafcetToolbarDnDProvider>
		</Page>
	);
};

export default GrafcetPage;
