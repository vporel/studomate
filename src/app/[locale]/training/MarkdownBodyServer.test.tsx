/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import MarkdownBodyServer from "./MarkdownBodyServer";

describe("MarkdownBodyServer", () => {
	it("rend synchrone les paragraphes et les listes Markdown", () => {
		const { container } = render(
			<MarkdownBodyServer source={"Intro\n\n- un\n- deux"} />,
		);

		expect(container.querySelector("p")?.textContent).toBe("Intro");
		expect(container.querySelectorAll("li")).toHaveLength(2);
	});
});
