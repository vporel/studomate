/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import ReferralArrow from "./ReferralArrow";

describe("ReferralArrow", () => {
	it("applique la couleur à la tige", () => {
		const { container } = render(
			<ReferralArrow color="rgb(1, 2, 3)" arrowTop="11px" />,
		);

		expect(container.firstChild).toHaveStyle({ background: "rgb(1, 2, 3)" });
	});

	it("positionne la pointe selon arrowTop", () => {
		const { container } = render(
			<ReferralArrow color="black" arrowTop="-7px" />,
		);

		const css = Array.from(document.styleSheets)
			.flatMap((sheet) => Array.from(sheet.cssRules))
			.map((rule) => rule.cssText)
			.join("");
		expect(container.firstChild).toBeInTheDocument();
		expect(css).toMatch(/top:\s*-7px/);
	});
});
