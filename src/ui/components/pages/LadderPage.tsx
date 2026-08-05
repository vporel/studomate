"use client";

import Ladder from "@/schemas/ladder/ladder.schema";
import { LadderContextProvider } from "@/ui/components/ladder/context/LadderContext";
import LadderFlow from "@/ui/components/ladder/flow/LadderFlow";
import LadderToolbar from "@/ui/components/ladder/toolbar/LadderToolbar";
import { LadderToolbarDnDProvider } from "@/ui/components/ladder/toolbar/LadderToolbarDnDContext";
import Page from "./Page";

const LadderPage = ({ initialLadder }: { initialLadder: Ladder }) => {
	return (
		<Page pageId={initialLadder.id} sx={{ flexDirection: "column" }}>
			<LadderContextProvider initialLadder={initialLadder}>
				<LadderToolbarDnDProvider>
					<LadderToolbar />
					<LadderFlow />
				</LadderToolbarDnDProvider>
			</LadderContextProvider>
		</Page>
	);
};

export default LadderPage;
