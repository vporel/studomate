import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
	it("serializes a plain object to JSON", () => {
		expect(JSON.parse(serializeJsonLd({ a: 1, b: "x" }))).toEqual({ a: 1, b: "x" });
	});

	it("escapes '<' so a value cannot break out of the <script> tag", () => {
		const html = serializeJsonLd({ description: "</script><script>alert(1)</script>" });

		expect(html).not.toContain("</script>");
		expect(html).toContain("\\u003c/script>");
	});
});
