import { Dialect } from "@/expression-language/dialect.enum";
import Action, {
	ActionType,
} from "@/schemas/grafcet/action.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ActionHelper from "@/schemas/grafcet/helpers/action.helper";
import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import Step from "@/schemas/grafcet/step.schema";
import Transition from "@/schemas/grafcet/transition.schema";
import { expressionRefs, identifierName } from "./expression-refs";
import { RawReference } from "./cross-reference.types";

function stepNumberOf(step: Step | null): number | null {
	return step && Number.isInteger(step.data.number) && (step.data.number as number) >= 0
		? (step.data.number as number)
		: null;
}

function transitionReferences(
	transition: Transition,
	grafcet: Grafcet,
	dialect: Dialect,
): RawReference[] {
	const { reads, writes } = expressionRefs(transition.getFullExpression(), dialect);
	const base = {
		programId: grafcet.id,
		programType: "grafcet" as const,
		locationId: transition.id,
		locationKind: "grafcet-transition" as const,
		locationParams: {},
	};
	return [
		...reads.map((variableName) => ({ ...base, variableName, access: "read" as const })),
		...writes.map((variableName) => ({ ...base, variableName, access: "write" as const })),
	];
}

function actionReferences(
	action: Action,
	grafcet: Grafcet,
	dialect: Dialect,
): RawReference[] {
	if (action.data.type === ActionType.TEXT) return [];

	let step: Step | null = null;
	try {
		step = ActionHelper.getStep(action.id, grafcet);
	} catch {
		step = null;
	}
	const stepNumber = stepNumberOf(step);
	const locationParams: Record<string, number> =
		stepNumber === null ? {} : { stepNumber };
	const base = {
		programId: grafcet.id,
		programType: "grafcet" as const,
		locationId: action.id,
		locationParams,
	};
	const refs: RawReference[] = [];

	for (const line of action.getExpressionLines()) {
		if (action.data.type === ActionType.BOOLEAN_VARIABLE) {
			const name = identifierName(line, dialect);
			if (name) {
				refs.push({
					...base,
					variableName: name,
					access: "write",
					locationKind: "grafcet-action-boolean",
				});
			}
			continue;
		}
		const { reads, writes } = expressionRefs(line, dialect);
		writes.forEach((variableName) =>
			refs.push({
				...base,
				variableName,
				access: "write",
				locationKind: "grafcet-action-assign",
			}),
		);
		reads.forEach((variableName) =>
			refs.push({
				...base,
				variableName,
				access: "read",
				locationKind: "grafcet-action-assign",
			}),
		);
	}
	return refs;
}

function stepReferences(step: Step, grafcet: Grafcet): RawReference[] {
	const stepNumber = stepNumberOf(step);
	if (stepNumber === null) return [];
	return [
		{
			variableName: StepHelper.getStepVariableMnemonic(stepNumber),
			access: "write",
			programId: grafcet.id,
			programType: "grafcet",
			locationId: step.id,
			locationKind: "grafcet-step",
			locationParams: { stepNumber },
		},
	];
}

/**
 * Toutes les références (lecture/écriture de variable) portées par un grafcet : identifiants des
 * réceptivités (lecture), cibles des actions booléennes / d'affectation (écriture) et leurs
 * membres droits (lecture), variable synthétique `Xn` de chaque étape numérotée (écriture par
 * l'étape). Ne lève jamais.
 */
export default function collectGrafcetReferences(
	grafcet: Grafcet,
	dialect: Dialect,
): RawReference[] {
	return [
		...Object.values(grafcet.transitions).flatMap((transition) =>
			transitionReferences(transition, grafcet, dialect),
		),
		...Object.values(grafcet.actions).flatMap((action) =>
			actionReferences(action as Action, grafcet, dialect),
		),
		...Object.values(grafcet.steps).flatMap((step) =>
			stepReferences(step as Step, grafcet),
		),
	];
}
