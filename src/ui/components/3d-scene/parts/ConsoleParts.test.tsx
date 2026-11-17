/** @jest-environment jsdom */
import { render } from "@testing-library/react";
import { CONSOLE_BUTTON_SIZE, PushButtonIllustration } from "./ConsoleParts";

describe("PushButtonIllustration", () => {
	it("is drawn at the size of a console button", () => {
		const { container } = render(
			<PushButtonIllustration
				color="#2e7d32"
				pressed={false}
				disabled={false}
			/>,
		);
		const svg = container.querySelector("svg")!;
		expect(CONSOLE_BUTTON_SIZE).toBe(55);
		expect(svg).toHaveAttribute("width", "55");
		expect(svg).toHaveAttribute("height", "55");
	});
});
