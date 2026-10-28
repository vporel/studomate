/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { SceneContent } from "./SceneApp";
import type SceneView from "./scene-view";

jest.mock("@react-three/fiber", () => ({
	Canvas: () => null,
}));
jest.mock("@react-three/drei", () => ({
	OrbitControls: () => null,
}));

function createView(): SceneView {
	const snapshot = {
		phase: "running",
		sceneId: null,
		sceneVersion: null,
		projectName: "Parking",
	};
	return {
		subscribe: () => () => {},
		getSnapshot: () => snapshot,
		sampleState: () => null,
		sendInteraction: () => {},
	} as unknown as SceneView;
}

describe("SceneContent", () => {
	it("shows the project title in its own window", () => {
		renderWithI18n(<SceneContent view={createView()} />);
		expect(screen.getByText("Parking")).toBeInTheDocument();
	});

	it("leaves the project title out when shown inline", () => {
		renderWithI18n(<SceneContent view={createView()} inline />);
		expect(screen.queryByText("Parking")).not.toBeInTheDocument();
	});
});
