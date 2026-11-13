import buildFaqJsonLd from "./faqJsonLd";

describe("buildFaqJsonLd", () => {
	const items = [
		{ question: "Q1 ?", answer: "R1." },
		{ question: "Q2 ?", answer: "R2." },
	];

	it("produit une FAQPage localisée, une question par élément, dans l'ordre", () => {
		const parsed = JSON.parse(buildFaqJsonLd("fr", items));

		expect(parsed["@type"]).toBe("FAQPage");
		expect(parsed.inLanguage).toBe("fr");
		expect(parsed.mainEntity).toEqual([
			{
				"@type": "Question",
				name: "Q1 ?",
				acceptedAnswer: { "@type": "Answer", text: "R1." },
			},
			{
				"@type": "Question",
				name: "Q2 ?",
				acceptedAnswer: { "@type": "Answer", text: "R2." },
			},
		]);
	});

	it("n'autorise pas une balise </script> injectée", () => {
		const html = buildFaqJsonLd("en", [{ question: "</script>", answer: "x" }]);

		expect(html).not.toContain("</script>");
	});
});
