/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { SceneContent } from "./SceneApp";
import type SceneView from "./scene-view";

const canvasProps = jest.fn();

jest.mock("@react-three/fiber", () => ({
	Canvas: (props: unknown) => {
		canvasProps(props);
		return null;
	},
}));
jest.mock("@react-three/drei", () => ({
	OrbitControls: () => null,
}));

jest.mock("./scene-views", () => ({
	getSceneViewDefinition: () => ({
		interpolate: () => null,
		Component: () => null,
		Controls: ({ sample }: { sample: () => unknown }) => (
			<span data-testid="controls">{JSON.stringify(sample())}</span>
		),
	}),
}));

const requestDock = jest.fn();

function createView(
	phase = "running",
	sceneId: string | null = null,
): SceneView {
	const snapshot = {
		phase,
		sceneId,
		sceneVersion: sceneId ? 1 : null,
		projectName: "Parking",
	};
	return {
		subscribe: () => () => {},
		getSnapshot: () => snapshot,
		sampleState: () => ({ lit: true }),
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

	it("caps the canvas pixel ratio at 2", () => {
		canvasProps.mockClear();
		renderWithI18n(<SceneContent view={createView()} />);
		expect(canvasProps.mock.calls[0][0].dpr).toEqual([1, 2]);
	});

	it("leaves the project title out when shown inline", () => {
		renderWithI18n(<SceneContent view={createView()} inline />);
		expect(screen.queryByText("Parking")).not.toBeInTheDocument();
	});

	describe("state shown by the controls", () => {
		it.each(["running", "paused"])(
			"follows the state of the scene while it is %s",
			(phase) => {
				renderWithI18n(<SceneContent view={createView(phase, "parking")} />);
				expect(screen.getByTestId("controls")).toHaveTextContent(
					'{"lit":true}',
				);
			},
		);

		it.each(["stopped", "waiting", "editor-closed"])(
			"shows no state while the scene is %s",
			(phase) => {
				renderWithI18n(<SceneContent view={createView(phase, "parking")} />);
				expect(screen.getByTestId("controls")).toHaveTextContent("null");
			},
		);
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
