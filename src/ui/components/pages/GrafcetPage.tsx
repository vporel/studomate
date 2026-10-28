"use client";

import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { GrafcetContextProvider } from "../grafcet/context/GrafcetContext";
import GrafcetFlow from "../grafcet/flow/GrafcetFlow";
import GrafcetToolbar from "../grafcet/toolbar/GrafcetToolbar";
import { GrafcetToolbarDnDProvider } from "../grafcet/toolbar/GrafcetToolbarDnDContext";
import Page from "./Page";

const GrafcetPage = ({
	initialGrafcet,
	fitToContainer = false,
}: {
	initialGrafcet: Grafcet;
	/** Fits the grafcet to the space the page is given, instead of showing the full print page. */
	fitToContainer?: boolean;
}) => {
	return (
		<Page
			pageId={initialGrafcet.id}
			sx={{ flexDirection: "column", paddingBottom: fitToContainer ? 0 : 4 }}
		>
			<GrafcetContextProvider initialGrafcet={initialGrafcet}>
				<GrafcetToolbarDnDProvider>
					<GrafcetToolbar />
					<GrafcetFlow fitToContainer={fitToContainer} />
				</GrafcetToolbarDnDProvider>
			</GrafcetContextProvider>
		</Page>
	);
};

export default GrafcetPage;
