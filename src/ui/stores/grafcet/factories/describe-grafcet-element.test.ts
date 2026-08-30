import describeGrafcetElement from "./describe-grafcet-element";

describe("describeGrafcetElement", () => {
	it("décrit une étape numérotée, initiale ou non", () => {
		expect(describeGrafcetElement("step", { number: 3 })).toBe("Étape 3");
		expect(describeGrafcetElement("step", { number: 1, initial: true })).toBe(
			"Étape initiale 1",
		);
	});

	it("gère l'étape non numérotée", () => {
		expect(describeGrafcetElement("step", { number: "" })).toBe(
			"Étape (non numérotée)",
		);
	});

	it("décrit une transition, expression multi-ligne aplatie", () => {
		expect(
			describeGrafcetElement("transition", { expression: "a\nb" }),
		).toBe("Transition : a b");
		expect(describeGrafcetElement("transition", { expression: "  " })).toBe(
			"Transition (vide)",
		);
	});

	it("décrit une action", () => {
		expect(
			describeGrafcetElement("action", { expression: "M1", type: "text" }),
		).toBe("Action : M1");
		expect(
			describeGrafcetElement("action", { expression: "", type: "text" }),
		).toBe("Action (vide)");
	});

	it("décrit un commentaire", () => {
		expect(describeGrafcetElement("comment", { text: "Cycle" })).toBe(
			"Commentaire : Cycle",
		);
		expect(describeGrafcetElement("comment", { text: "" })).toBe("Commentaire");
	});

	it("décrit les renvois", () => {
		expect(
			describeGrafcetElement("step-referral-source", { targetStepNumber: 5 }),
		).toBe("Renvoi vers l'étape 5");
		expect(
			describeGrafcetElement("step-referral-target", { sourceStepNumber: 5 }),
		).toBe("Renvoi depuis l'étape 5");
		expect(
			describeGrafcetElement("step-referral-source", { targetStepNumber: "" }),
		).toBe("Renvoi vers une étape");
	});

	it("décrit les jonctions via le libellé de type", () => {
		expect(describeGrafcetElement("junction-and-start", {})).toBe(
			"Divergence en ET",
		);
		expect(describeGrafcetElement("junction-or-end", {})).toBe(
			"Convergence en OU",
		);
	});
});
