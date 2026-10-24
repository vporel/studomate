"use client";

import Ladder from "@/schemas/ladder/ladder.schema";
import { LadderContextProvider } from "@/ui/components/ladder/context/LadderContext";
import LadderFlow from "@/ui/components/ladder/flow/LadderFlow";
import CounterBlockDialog from "@/ui/components/ladder/system-blocks/CounterBlockDialog";
import TimerBlockDialog from "@/ui/components/ladder/system-blocks/TimerBlockDialog";
import LadderToolbar from "@/ui/components/ladder/toolbar/LadderToolbar";
import { LadderToolbarDnDProvider } from "@/ui/components/ladder/toolbar/LadderToolbarDnDContext";
import SystemBlocksPalette, {
	type SystemBlocksPalettePosition,
} from "@/ui/components/ladder/toolbar/SystemBlocksPalette";
import { useEffect, useState } from "react";
import useCanEdit from "../projects/useCanEdit";
import Page from "./Page";

const LadderPage = ({ initialLadder }: { initialLadder: Ladder }) => {
	const [systemBlocksPaletteOpen, setSystemBlocksPaletteOpen] = useState(false);
	const [systemBlocksPalettePosition, setSystemBlocksPalettePosition] =
		useState<SystemBlocksPalettePosition | null>(null);
	const canEdit = useCanEdit();
	useEffect(() => {
		if (!canEdit) setSystemBlocksPaletteOpen(false);
	}, [canEdit]);

	return (
		<Page
			pageId={initialLadder.id}
			sx={{ flexDirection: "column", position: "relative" }}
		>
			<LadderContextProvider initialLadder={initialLadder}>
				<LadderToolbarDnDProvider>
					<LadderToolbar
						systemBlocksPaletteOpen={systemBlocksPaletteOpen}
						onToggleSystemBlocksPalette={() =>
							setSystemBlocksPaletteOpen((open) => !open)
						}
					/>
					<LadderFlow />
					<TimerBlockDialog />
					<CounterBlockDialog />
					{systemBlocksPaletteOpen && (
						<SystemBlocksPalette
							position={systemBlocksPalettePosition}
							onPositionChange={setSystemBlocksPalettePosition}
							onClose={() => setSystemBlocksPaletteOpen(false)}
						/>
					)}
				</LadderToolbarDnDProvider>
			</LadderContextProvider>
		</Page>
	);
};

export default LadderPage;
