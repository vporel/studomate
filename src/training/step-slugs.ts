import type { Locale } from "@/i18n/config";
import type { TrainingModuleId } from "@/training/module-ids";
import A0_STEP_IDS from "./step-ids/a0";
import A1_STEP_IDS from "./step-ids/a1";
import A2_STEP_IDS from "./step-ids/a2";
import A3_STEP_IDS from "./step-ids/a3";
import A4_STEP_IDS from "./step-ids/a4";

type StepIdOf<T> = T[keyof T] & string;

/**
 * URL slug of each training step in French, per module (step ids are only unique within a
 * module). English URLs use the step id itself.
 */
const FR_STEP_SLUGS: {
	a0: Record<StepIdOf<typeof A0_STEP_IDS>, string>;
	a1: Record<StepIdOf<typeof A1_STEP_IDS>, string>;
	a2: Record<StepIdOf<typeof A2_STEP_IDS>, string>;
	a3: Record<StepIdOf<typeof A3_STEP_IDS>, string>;
	a4: Record<StepIdOf<typeof A4_STEP_IDS>, string>;
} = {
	a0: {
		automatisme: "automatisme",
		"logic-basics": "logique-de-base",
		"scan-cycle": "cycle-de-scrutation",
	},
	a1: {
		"grafcet-definition": "definition-grafcet",
		theory: "theorie",
		"observe-linear": "observer-sequence-lineaire",
		"theory-actions": "theorie-actions",
		"observe-actions": "observer-actions",
		"exercise-linear": "exercice-sequence-lineaire",
		"theory-timer": "theorie-temporisation",
		"observe-timer": "observer-temporisation",
		"synthesis-traffic-light": "synthese-feu-tricolore",
		"theory-or-divergence": "theorie-divergence-en-ou",
		"exercise-or-divergence": "exercice-divergence-en-ou",
		"theory-and-divergence": "theorie-divergence-en-et",
		"exercise-and-divergence": "exercice-divergence-en-et",
		"synthesis-parking": "synthese-parking",
		"synthesis-crossroads": "synthese-carrefour",
		"reading-errors": "lecture-des-erreurs",
	},
	a2: {
		"ladder-basics": "bases-du-ladder",
		"theory-contacts-coils": "theorie-contacts-bobines",
		"exercise-reading": "exercice-lecture",
		"exercise-logic": "exercice-logique",
		"theory-self-holding": "theorie-auto-maintien",
		"exercise-self-holding": "exercice-auto-maintien",
		"exercise-interlock": "exercice-verrouillage",
		"theory-set-reset": "theorie-set-reset",
		"exercise-memory": "exercice-memoire",
		"theory-edges": "theorie-fronts",
		"exercise-edges-reading": "exercice-lecture-fronts",
		"exercise-toggle": "exercice-bascule",
		"synthesis-gate": "synthese-portail",
		conclusion: "conclusion",
	},
	a3: {
		"theory-timers": "theorie-temporisateurs",
		"exercise-timers-reading": "exercice-lecture-temporisateurs",
		"exercise-timers": "exercice-temporisateurs",
		"theory-counters": "theorie-compteurs",
		"exercise-counters": "exercice-compteurs",
		"theory-numeric": "theorie-grandeurs-numeriques",
		"exercise-tank": "exercice-reservoir",
		"theory-types": "theorie-types",
		"exercise-scaling": "exercice-mise-a-l-echelle",
		"theory-structure": "theorie-structure",
		"exercise-subprograms": "exercice-sous-programmes",
		"synthesis-packing": "synthese-conditionnement",
		conclusion: "conclusion",
	},
	a4: {
		"theory-steps-ladder": "theorie-etapes-ladder",
		"exercise-grafcet-naive": "exercice-grafcet-naif",
		"theory-method-ladder": "theorie-methode-ladder",
		"exercise-grafcet-linear": "exercice-grafcet-lineaire",
		"theory-actions-ladder": "theorie-actions-ladder",
		"theory-timed-actions-ladder": "theorie-actions-temporisees-ladder",
		"synthesis-drilling": "synthese-percage",
		"theory-divergences-ladder": "theorie-divergences-ladder",
		"exercise-grafcet-or-divergence": "exercice-grafcet-divergence-en-ou",
		"exercise-grafcet-and-divergence": "exercice-grafcet-divergence-en-et",
		"theory-grafcet-reset": "theorie-grafcet-reinitialisation",
		"exercise-grafcet-reset": "exercice-grafcet-reinitialisation",
		"synthesis-parking": "synthese-parking",
		"synthesis-gate-grafcet": "synthese-portail-grafcet",
		conclusion: "conclusion",
	},
};

const SLUGS: Record<
	Locale,
	Record<TrainingModuleId, Record<string, string>>
> = {
	fr: FR_STEP_SLUGS,
	en: { a0: {}, a1: {}, a2: {}, a3: {}, a4: {} },
};

/** Slug of a training step in `locale`; the id itself when the step has none. */
export function trainingStepSlug(
	locale: Locale,
	moduleId: TrainingModuleId,
	stepId: string,
): string {
	return SLUGS[locale][moduleId][stepId] ?? stepId;
}

/** Step id behind a slug of `locale`, `null` when the slug belongs to no step of the module. */
export function trainingStepIdFromSlug(
	locale: Locale,
	moduleId: TrainingModuleId,
	slug: string,
	stepIds: readonly string[],
): string | null {
	return (
		stepIds.find((id) => trainingStepSlug(locale, moduleId, id) === slug) ??
		null
	);
}
