/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { Vector3 } from "three";
import SceneWidthFit from "./SceneWidthFit";

const state = {
	camera: { position: new Vector3() },
	controls: null as { target: Vector3; update: jest.Mock } | null,
	size: { width: 0, height: 0 },
};
jest.mock("@react-three/fiber", () => ({
	useThree: (selector: (s: typeof state) => unknown) => selector(state),
}));

function setup(width: number, height: number) {
	state.camera = { position: new Vector3(0, 0, 10) };
	state.controls = { target: new Vector3(0, 0, 0), update: jest.fn() };
	state.size = { width, height };
	return render(<SceneWidthFit />);
}

function resize(
	rerender: (ui: React.ReactElement) => void,
	width: number,
	height: number,
) {
	state.size = { width, height };
	rerender(<SceneWidthFit />);
}

describe("SceneWidthFit", () => {
	it("leaves the camera where it is in a view as wide as the reference", () => {
		setup(800, 450);
		expect(state.camera.position.z).toBe(10);
		expect(state.controls!.update).not.toHaveBeenCalled();
	});

	it("moves the camera back in a narrow view, so that the width of the scene stays visible", () => {
		setup(400, 600);
		expect(state.camera.position.z).toBeCloseTo(20);
		expect(state.controls!.update).toHaveBeenCalledTimes(1);
	});

	it("brings it back when the view widens again", () => {
		const { rerender } = setup(400, 600);
		resize(rerender, 900, 600);
		expect(state.camera.position.z).toBeCloseTo(10);
	});

	it("keeps the zoom of the user, relative to the new view", () => {
		const { rerender } = setup(400, 600);
		state.camera.position.z = 30;
		resize(rerender, 300, 600);
		expect(state.camera.position.z).toBeCloseTo(40);
	});

	it("waits for the controls and for a size", () => {
		state.camera = { position: new Vector3(0, 0, 10) };
		state.controls = null;
		state.size = { width: 400, height: 600 };
		const { rerender } = render(<SceneWidthFit />);
		expect(state.camera.position.z).toBe(10);

		state.controls = { target: new Vector3(), update: jest.fn() };
		state.size = { width: 400, height: 0 };
		rerender(<SceneWidthFit />);
		expect(state.camera.position.z).toBe(10);
	});
});
