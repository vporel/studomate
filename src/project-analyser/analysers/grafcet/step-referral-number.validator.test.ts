import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import {
	checkReferredStepExists,
	validateStepReferralNumber,
} from "./step-referral-number.validator";

const source = {
	sourceType: "grafcet-step-referral-source" as const,
	sourceId: "ref-1",
};

describe("validateStepReferralNumber", () => {
	it.each([0, 1, 42])("accepte l'entier positif %p", (value) => {
		expect(validateStepReferralNumber(value, source, false)).toEqual([]);
	});

	it.each(["", null, undefined] as const)(
		"signale la valeur vide %p",
		(value) => {
			const issues = validateStepReferralNumber(value, source, false);

			expect(issues).toHaveLength(1);
			expect(issues[0]!.code).toBe("STEP_REFERRAL_NUMBER_EMPTY");
			expect(issues[0]!.source).toEqual(source);
		},
	);

	it.each(["", null, undefined] as const)(
		"tolère la valeur vide %p avec allowEmptyContent",
		(value) => {
			expect(validateStepReferralNumber(value, source, true)).toEqual([]);
		},
	);

	it.each([-1, 1.5, NaN])("refuse %p (entier positif attendu)", (value) => {
		const issues = validateStepReferralNumber(value, source, false);

		expect(issues).toHaveLength(1);
		expect(issues[0]!.code).toBe("STEP_REFERRAL_NUMBER_NOT_POSITIVE_INTEGER");
	});

	it("vérifie aussi le nombre invalide quand allowEmptyContent est actif", () => {
		const issues = validateStepReferralNumber(-3, source, true);

		expect(issues[0]!.code).toBe("STEP_REFERRAL_NUMBER_NOT_POSITIVE_INTEGER");
	});
});

describe("checkReferredStepExists", () => {
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addStep(new StepBuilder().id("s1").number(3).build())
		.build();

	it("ne signale rien quand l'étape existe", () => {
		expect(checkReferredStepExists(3, grafcet, source)).toEqual([]);
	});

	it("signale l'étape introuvable avec son numéro", () => {
		const issues = checkReferredStepExists(9, grafcet, source);

		expect(issues).toHaveLength(1);
		expect(issues[0]!.code).toBe("STEP_REFERRAL_REFERENCED_STEP_NOT_FOUND");
		expect(issues[0]!.params).toEqual({ stepNumber: 9 });
	});
});
