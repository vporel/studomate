/**
 * @jest-environment jsdom
 */
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import { render } from "@testing-library/react";
import JunctionBarsRow from "./JunctionBarsRow";

const mockBar = jest.fn();
jest.mock("./JunctionNodeVerticalBar", () => ({
	__esModule: true,
	default: (props: unknown) => {
		mockBar(props);
		return <i data-testid="bar" />;
	},
}));

const data = new JunctionAndEndBuilder().id("j").position(0, 0).build().data;

describe("JunctionBarsRow", () => {
	beforeEach(() => mockBar.mockClear());

	it("rend une barre par branche, dans l'ordre", () => {
		const { getAllByTestId } = render(
			<JunctionBarsRow data={data} color="red" height="13px" />,
		);

		expect(getAllByTestId("bar")).toHaveLength(data.branchesOrder.length);
		expect(mockBar.mock.calls.map(([p]) => p.branchId)).toEqual(
			data.branchesOrder,
		);
		mockBar.mock.calls.forEach(([p], i) => {
			expect(p).toMatchObject({
				color: "red",
				pivot: false,
				left: data.branches[data.branchesOrder[i]!]!.position,
			});
		});
	});

	it("rend uniquement la barre du pivot avec `pivot`", () => {
		const { getAllByTestId } = render(
			<JunctionBarsRow data={data} color="red" height="12px" pivot />,
		);

		expect(getAllByTestId("bar")).toHaveLength(1);
		expect(mockBar).toHaveBeenCalledWith({
			color: "red",
			left: data.pivotPosition,
			pivot: true,
		});
	});

	it("applique la hauteur à la rangée", () => {
		const { container } = render(
			<JunctionBarsRow data={data} color="red" height="14px" />,
		);

		expect(container.firstChild).toHaveStyle({ height: "14px" });
	});
});
