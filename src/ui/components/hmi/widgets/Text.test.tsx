/** @jest-environment jsdom */

import { TextData } from "@/schemas/hmi/hmi-widget.schema";
import { render } from "@testing-library/react";
import Text from "./Text";

jest.mock("./useHmiStyleAnimation", () => ({
	__esModule: true,
	default: () => ({}),
}));

const baseData = (style: Partial<TextData["style"]> = {}): TextData => ({
	text: "Bonjour",
	style: { fontSize: 14, color: "#333333", align: "center", ...style },
});

describe("Text", () => {
	const box = (container: HTMLElement) => container.firstChild as HTMLElement;

	it("poids et style de police normaux par défaut", () => {
		const { container } = render(<Text data={baseData()} />);
		expect(box(container)).toHaveStyle({
			fontWeight: "normal",
			fontStyle: "normal",
		});
	});

	it("style.bold rend le texte en gras", () => {
		const { container } = render(<Text data={baseData({ bold: true })} />);
		expect(box(container)).toHaveStyle({ fontWeight: "700" });
	});

	it("style.italic rend le texte en italique", () => {
		const { container } = render(<Text data={baseData({ italic: true })} />);
		expect(box(container)).toHaveStyle({ fontStyle: "italic" });
	});
});
