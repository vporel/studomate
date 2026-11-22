/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { PerspectiveCamera, type Vector3 } from "three";
import labelZoom from "./label-zoom";
import Label from "./Label";

const htmlProps = jest.fn();

jest.mock("@react-three/drei", () => ({
	Html: (props: { children: React.ReactNode }) => {
		htmlProps(props);
		return <div data-testid="html">{props.children}</div>;
	},
}));
const camera = new PerspectiveCamera(50);
camera.position.set(0, 0, 10);
camera.updateMatrixWorld();

jest.mock("@react-three/fiber", () => ({
	useFrame: (callback: (state: { camera: unknown }) => void) => {
		useEffect(() => callback({ camera }), [callback]);
	},
}));

beforeAll(() => {
	// In jsdom the scene `<group>` is a plain element: give it the origin as world position.
	Object.defineProperty(HTMLElement.prototype, "getWorldPosition", {
		value: (target: Vector3) => target.set(0, 0, 0),
		configurable: true,
	});
});

describe("Label", () => {
	beforeEach(() => htmlProps.mockClear());

	it("shows its text once the first frame has been rendered", () => {
		render(<Label position={[0, 1, 2]}>Floor 1</Label>);
		expect(screen.getByText("Floor 1")).toBeInTheDocument();
	});

	it("stays under the floating boxes laid over the scene", () => {
		render(<Label position={[0, 1, 2]}>Floor 1</Label>);
		const [min, max] = htmlProps.mock.calls[0][0].zIndexRange as [
			number,
			number,
		];
		expect(Math.max(min, max)).toBeLessThan(20);
	});

	it("sizes its content from the camera distance", () => {
		render(<Label position={[0, 0, 0]}>Floor 1</Label>);
		const content = screen.getByText("Floor 1") as HTMLElement;
		expect(Number(content.style.zoom)).toBeCloseTo(labelZoom(10, 50, 9));
	});
});
