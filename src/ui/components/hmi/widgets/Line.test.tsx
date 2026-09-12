/** @jest-environment jsdom */

import { LineData } from "@/schemas/hmi/hmi-widget.schema";
import { render } from "@testing-library/react";
import Line from "./Line";

jest.mock("./useHmiStyleAnimation", () => ({
	__esModule: true,
	default: () => ({}),
}));

const baseData = (style: Partial<LineData["style"]>): LineData => ({
	style: { color: "#123456", ...style },
});

describe("Line", () => {
	const bar = (container: HTMLElement) =>
		container.firstChild!.firstChild as HTMLElement;

	it("horizontal : trait pleine largeur, hauteur = épaisseur", () => {
		const { container } = render(
			<Line data={baseData({ thickness: 3, orientation: "horizontal" })} />,
		);
		expect(bar(container)).toHaveStyle({
			width: "100%",
			height: "3px",
			backgroundColor: "rgb(18, 52, 86)",
		});
	});

	it("vertical : trait pleine hauteur, largeur = épaisseur", () => {
		const { container } = render(
			<Line data={baseData({ thickness: 5, orientation: "vertical" })} />,
		);
		expect(bar(container)).toHaveStyle({ height: "100%", width: "5px" });
	});

	it("épaisseur par défaut de 2px quand absente", () => {
		const { container } = render(<Line data={baseData({})} />);
		expect(bar(container)).toHaveStyle({ height: "2px" });
	});
});
