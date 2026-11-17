/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import Label from "./Label";

const htmlProps = jest.fn();

jest.mock("@react-three/drei", () => ({
	Html: (props: { children: React.ReactNode }) => {
		htmlProps(props);
		return <div data-testid="html">{props.children}</div>;
	},
}));
jest.mock("@react-three/fiber", () => ({
	useFrame: (callback: () => void) => {
		useEffect(() => callback(), [callback]);
	},
}));

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
});
