/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { SceneContent } from "./SceneApp";
import type SceneView from "./scene-view";

jest.mock("@react-three/fiber", () => ({
	Canvas: () => null,
}));
jest.mock("@react-three/drei", () => ({
	OrbitControls: () => null,
}));

const requestDock = jest.fn();

function createView(phase = "running"): SceneView {
	const snapshot = {
		phase,
		sceneId: null,
		sceneVersion: null,
		projectName: "Parking",
	};
	return {
		subscribe: () => () => {},
		getSnapshot: () => snapshot,
		sampleState: () => null,
		sendInteraction: () => {},
		requestDock,
	} as unknown as SceneView;
}

describe("SceneContent", () => {
	beforeEach(() => requestDock.mockClear());

	it("shows the project title in its own window", () => {
		renderWithI18n(<SceneContent view={createView()} />);
		expect(screen.getByText("Parking")).toBeInTheDocument();
	});

	it("leaves the project title out when shown inline", () => {
		renderWithI18n(<SceneContent view={createView()} inline />);
		expect(screen.queryByText("Parking")).not.toBeInTheDocument();
	});

	describe("button back to the editor", () => {
		it.each(["stopped", "running", "paused"])(
			"asks the editor to show the scene in its page while it is linked (%s)",
			(phase) => {
				renderWithI18n(<SceneContent view={createView(phase)} />);

				fireEvent.click(
					screen.getByRole("button", { name: "Revenir dans l'éditeur" }),
				);

				expect(requestDock).toHaveBeenCalledTimes(1);
			},
		);

		it.each(["waiting", "editor-closed", "protocol-mismatch"])(
			"is not offered when no editor can answer (%s)",
			(phase) => {
				renderWithI18n(<SceneContent view={createView(phase)} />);
				expect(screen.queryByRole("button")).not.toBeInTheDocument();
			},
		);

		it("is not offered when the scene is already in the page", () => {
			renderWithI18n(<SceneContent view={createView()} inline />);
			expect(screen.queryByRole("button")).not.toBeInTheDocument();
		});
	});
});
