"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { GrafcetContextProvider } from "../grafcet/context/GrafcetContext";
import GrafcetFlow from "../grafcet/flow/GrafcetFlow";
import GrafcetToolbar from "../grafcet/toolbar/GrafcetToolbar";
import { GrafcetToolbarDnDProvider } from "../grafcet/toolbar/GrafcetToolbarDnDContext";
import Page from "./Page";

const GrafcetPage = ({ initialGrafcet }: { initialGrafcet: Grafcet }) => {
	return (
		<Page
			pageId={initialGrafcet.id}
			sx={{ flexDirection: "column", paddingBottom: 4 }}
		>
			<GrafcetContextProvider initialGrafcet={initialGrafcet}>
				<GrafcetToolbarDnDProvider>
					<GrafcetToolbar />
					<GrafcetFlow />
				</GrafcetToolbarDnDProvider>
			</GrafcetContextProvider>
		</Page>
	);
};

export default GrafcetPage;
