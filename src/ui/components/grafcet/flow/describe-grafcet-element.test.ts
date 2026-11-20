import { LOCALES, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { GRAFCET_ELEMENT_TYPES } from "@/schemas/grafcet/element.schema";
import { createTranslator } from "next-intl";
import describeGrafcetElement, {
	type GrafcetElementsTranslator,
	grafcetElementTypeLabel,
} from "./describe-grafcet-element";

const translator = (locale: Locale) =>
	createTranslator({
		locale,
		messages: getMessages(locale),
		namespace: "grafcetEditor.elements",
	}) as unknown as GrafcetElementsTranslator;

const fr = translator("fr");
const describe_ = (
	type: Parameters<typeof describeGrafcetElement>[0],
	data: unknown,
) => describeGrafcetElement(type, data, fr);

describe("describeGrafcetElement", () => {
	it("décrit une étape numérotée, initiale ou non", () => {
		expect(describe_("step", { number: 3 })).toBe("Étape 3");
		expect(describe_("step", { number: 1, initial: true })).toBe(
			"Étape initiale 1",
		);
	});

	it("gère l'étape non numérotée", () => {
		expect(describe_("step", { number: "" })).toBe("Étape (non numérotée)");
	});

	it("décrit une transition, expression multi-ligne aplatie", () => {
		expect(describe_("transition", { expression: "a\nb" })).toBe(
			"Transition : a b",
		);
		expect(describe_("transition", { expression: "  " })).toBe(
			"Transition (vide)",
		);
	});

	it("décrit une action", () => {
		expect(describe_("action", { expression: "M1", type: "text" })).toBe(
			"Action : M1",
		);
		expect(describe_("action", { expression: "", type: "text" })).toBe(
			"Action (vide)",
		);
	});

	it("décrit un commentaire", () => {
		expect(describe_("comment", { text: "Cycle" })).toBe("Commentaire : Cycle");
		expect(describe_("comment", { text: "" })).toBe("Commentaire");
	});

	it("décrit les renvois", () => {
		expect(describe_("step-referral-source", { targetStepNumber: 5 })).toBe(
			"Renvoi vers l'étape 5",
		);
		expect(describe_("step-referral-target", { sourceStepNumber: 5 })).toBe(
			"Renvoi depuis l'étape 5",
		);
		expect(describe_("step-referral-source", { targetStepNumber: "" })).toBe(
			"Renvoi vers une étape",
		);
	});

	it("décrit les jonctions via le libellé de type", () => {
		expect(describe_("junction-and-start", {})).toBe("Divergence en ET");
		expect(describe_("junction-or-end", {})).toBe("Convergence en OU");
	});

	it("décrit les éléments dans la langue de l'interface", () => {
		expect(
			describeGrafcetElement("step", { number: 2 }, translator("en")),
		).toBe("Step 2");
		expect(
			describeGrafcetElement(
				"action",
				{ expression: "vertNS1p", type: "text" },
				translator("es"),
			),
		).toBe("Acción: vertNS1p");
		expect(
			describeGrafcetElement("junction-or-start", {}, translator("es")),
		).toBe("Divergencia en O");
	});
});

describe("grafcetElementTypeLabel", () => {
	it.each(LOCALES)("a un libellé pour chaque type d'élément (%s)", (locale) => {
		const t = translator(locale);
		for (const type of GRAFCET_ELEMENT_TYPES) {
			const label = grafcetElementTypeLabel(type, t);
			expect(label).toBeTruthy();
			expect(label).not.toContain("grafcetEditor");
		}
	});
});
