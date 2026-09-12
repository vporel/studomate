/** @jest-environment jsdom */
import renderMarkdown from "./markdown";

describe("renderMarkdown", () => {
	it("convertit le Markdown en HTML", async () => {
		const html = await renderMarkdown("## Titre\n\nUn **gras** et du `code`.");

		expect(html).toContain("<h2");
		expect(html).toContain("<strong>gras</strong>");
		expect(html).toContain("<code>code</code>");
	});

	it("rend les tableaux GFM", async () => {
		const html = await renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |");

		expect(html).toContain("<table>");
	});

	it("assainit le HTML dangereux", async () => {
		const html = await renderMarkdown(
			"Bonjour <script>alert(1)</script><img src=x onerror=alert(1)>",
		);

		expect(html).not.toContain("<script>");
		expect(html).not.toContain("onerror");
	});
});
