/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import MarkdownBody from "./markdown-body";

describe("MarkdownBody", () => {
	it("rend la source Markdown en HTML", async () => {
		render(<MarkdownBody source="Un **gras** et un [lien](https://example.com)." />);

		expect(await screen.findByText("gras")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "lien" })).toHaveAttribute(
			"href",
			"https://example.com",
		);
	});

	it("rend une liste Markdown", async () => {
		render(<MarkdownBody source={"- premier\n- second"} />);

		expect(await screen.findByText("premier")).toBeInTheDocument();
		expect(screen.getByText("second")).toBeInTheDocument();
	});

	it("assainit le HTML dangereux", async () => {
		const { container } = render(
			<MarkdownBody source="Texte <script>alert(1)</script>" />,
		);

		await screen.findByText("Texte", { exact: false });
		expect(container.querySelector("script")).not.toBeInTheDocument();
	});
});
