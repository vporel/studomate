"use client";

import Pane from "@/ui/lib/split-pane/Pane";
import SplitPane from "@/ui/lib/split-pane/SplitPane";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import WatchTables from "../watch-tables/WatchTables";
import {
	getSidePanelSceneShare,
	setSidePanelSceneShare,
} from "@/persistence/preferences.storage";

//Three.js and WebGL are loaded when the scene is first shown.
const Scene3dSidePanel = dynamic(
	() => import("@/ui/components/3d-scene/Scene3dSidePanel"),
	{ ssr: false },
);

const DEFAULT_SCENE_SHARE = 55;
const MIN_PART_HEIGHT = 150;

/** What the side panel on the right of the editors shows; it is hidden when it shows nothing. */
export function useSidePanelContent() {
	return useProjectStore(
		useShallow((state) => ({
			scene3d: state.ui.scene3dSidePanelVisible && !!state.project?.scene3d,
			watchTables:
				state.ui.watchTablesVisible && state.mode === ProjectMode.SIMULATION,
		})),
	);
}

/**
 * The 3D scene above the watch tables, each one taking the whole panel when it is alone. The
 * tree stays the same whichever parts are shown, so that the scene is not relinked when the watch
 * tables come and go.
 */
export default function SidePanel() {
	const { scene3d, watchTables } = useSidePanelContent();
	const [sceneShare, setSceneShare] = useState(
		() => getSidePanelSceneShare() ?? DEFAULT_SCENE_SHARE,
	);
	const both = scene3d && watchTables;

	return (
		<SplitPane split="horizontal">
			<Pane
				visible={scene3d}
				initialSize={both ? `${sceneShare}%` : undefined}
				minSize={both ? MIN_PART_HEIGHT : undefined}
				style={{ overflow: "hidden" }}
				onSizeChange={({ percent }) => {
					setSceneShare(percent);
					setSidePanelSceneShare(percent);
				}}
			>
				{scene3d && <Scene3dSidePanel />}
			</Pane>
			<Pane visible={watchTables} minSize={both ? MIN_PART_HEIGHT : undefined}>
				{watchTables && <WatchTables />}
			</Pane>
		</SplitPane>
	);
}
