/**
 * @jest-environment jsdom
 */
import Scene3dLinkManager from "@/ui/stores/project/managers/3d-scene/scene3d-link.manager";
import createInProcessScene3dLinkHost from "@/ui/stores/project/managers/3d-scene/in-process-scene3d-link-host";
import { render, screen } from "@testing-library/react";
import { StrictMode, useSyncExternalStore } from "react";
import InlineScene from "./InlineScene";
import type SceneView from "./scene-view";

jest.mock("./SceneApp", () => ({
	SceneContent: ({ view }: { view: SceneView }) => {
		const { sceneId } = useSyncExternalStore(view.subscribe, view.getSnapshot);
		return <div data-testid="scene">{sceneId ?? "none"}</div>;
	},
}));

function createManager() {
	const state: any = {
		project: {
			name: "Parking",
			scene3d: { sceneId: "parking", sceneVersion: 1, bindings: {} },
		},
		simulationManager: {
			getScene3dSnapshot: () => null,
			subscribeScene3d: () => () => {},
			sendScene3dInteraction: () => {},
		},
	};
	return new Scene3dLinkManager(createInProcessScene3dLinkHost(() => state));
}

describe("InlineScene", () => {
	it("receives the scene of its editor when React runs its effects twice", async () => {
		const manager = createManager();
		render(
			<StrictMode>
				<InlineScene
					openTransport={() => manager.openInline()}
					onDisconnect={() => manager.close()}
				/>
			</StrictMode>,
		);

		expect(await screen.findByText("parking")).toBeInTheDocument();
	});

	it("disconnects the editor when unmounted", () => {
		const manager = createManager();
		const close = jest.spyOn(manager, "close");
		const { unmount } = render(
			<InlineScene
				openTransport={() => manager.openInline()}
				onDisconnect={() => manager.close()}
			/>,
		);

		unmount();

		expect(close).toHaveBeenCalled();
	});
});
