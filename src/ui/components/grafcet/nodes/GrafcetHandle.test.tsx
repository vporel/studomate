/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { Position } from "@xyflow/react";
import GrafcetHandle from "./GrafcetHandle";

const mockHandle = jest.fn();
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: (props: unknown) => {
		mockHandle(props);
		return null;
	},
}));

const baseProps = {
	limit: 3,
	id: "h1",
	type: "source" as const,
	position: Position.Bottom,
};

describe("GrafcetHandle", () => {
	beforeEach(() => mockHandle.mockClear());

	it("applique la couleur à la bordure et au fond", () => {
		render(<GrafcetHandle {...baseProps} color="red" />);

		expect(mockHandle.mock.calls[0][0].style).toEqual({
			borderColor: "red",
			backgroundColor: "red",
		});
	});

	it("conserve les styles supplémentaires", () => {
		render(
			<GrafcetHandle {...baseProps} color="red" style={{ left: "5px" }} />,
		);

		expect(mockHandle.mock.calls[0][0].style).toEqual({
			left: "5px",
			borderColor: "red",
			backgroundColor: "red",
		});
	});

	it("transmet limit, id, type et position sans color", () => {
		render(<GrafcetHandle {...baseProps} color="red" />);

		const props = mockHandle.mock.calls[0][0];
		expect(props).toMatchObject(baseProps);
		expect(props.color).toBeUndefined();
	});
});
