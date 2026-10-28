"use client";

import HmiPageView from "../hmi/HmiPageView";
import { useProjectStore } from "../projects/ProjectContext";

/**
 * An HMI page is edited in its own tab. During the simulation the page stays mounted behind the
 * HMI simulation tab, so that the commands of its stack remain valid.
 */
export default function EmbeddedHmiView({ pageId }: { pageId: string }) {
	const hmiManager = useProjectStore((state) => state.hmiManager);

	return (
		<HmiPageView
			initialHmiPage={hmiManager.getHmiPageOrThrow(pageId)}
			fitToContainer
		/>
	);
}
