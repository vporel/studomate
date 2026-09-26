import LiteralsBuilder from "../builders/literals.builder";
import { getNumberLiteralKind } from "./literals";

describe("getNumberLiteralKind", () => {
	it("renvoie le genre porté par le nœud", () => {
		expect(getNumberLiteralKind(LiteralsBuilder.buildNumberNode(2, 0, "real"))).toBe(
			"real",
		);
		expect(
			getNumberLiteralKind(LiteralsBuilder.buildNumberNode(500, 0, "time")),
		).toBe("time");
	});

	it("déduit le genre de la valeur quand le nœud n'en porte pas", () => {
		expect(getNumberLiteralKind(LiteralsBuilder.buildNumberNode(2))).toBe("integer");
		expect(getNumberLiteralKind(LiteralsBuilder.buildNumberNode(2.5))).toBe("real");
	});
});
