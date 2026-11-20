import type { Locale } from "@/i18n/config";
import type { TrainingModuleId } from "@/training/module-ids";
import A0_STEP_IDS from "./step-ids/a0";
import A1_STEP_IDS from "./step-ids/a1";
import A2_STEP_IDS from "./step-ids/a2";
import A3_STEP_IDS from "./step-ids/a3";
import A4_STEP_IDS from "./step-ids/a4";
import A5_STEP_IDS from "./step-ids/a5";

type StepIdOf<T> = T[keyof T] & string;

type StepIds = {
	a0: typeof A0_STEP_IDS;
	a1: typeof A1_STEP_IDS;
	a2: typeof A2_STEP_IDS;
	a3: typeof A3_STEP_IDS;
	a4: typeof A4_STEP_IDS;
	a5: typeof A5_STEP_IDS;
};

/**
 * URL slug of each training step in French, per module (step ids are only unique within a
 * module). English URLs use the step id itself, except for the steps listed in `EN_STEP_SLUGS`.
 */
const FR_STEP_SLUGS: {
	a0: Record<StepIdOf<typeof A0_STEP_IDS>, string>;
	a1: Record<StepIdOf<typeof A1_STEP_IDS>, string>;
	a2: Record<StepIdOf<typeof A2_STEP_IDS>, string>;
	a3: Record<StepIdOf<typeof A3_STEP_IDS>, string>;
	a4: Record<StepIdOf<typeof A4_STEP_IDS>, string>;
	a5: Record<StepIdOf<typeof A5_STEP_IDS>, string>;
} = {
	a0: {
		automatisme: "automatisme",
		"logic-basics": "logique-de-base",
		"scan-cycle": "cycle-de-scrutation",
		conclusion: "conclusion",
	},
	a1: {
		"grafcet-definition": "definition-grafcet",
		theory: "etapes-transitions-receptivites",
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
		"theory-types": "theorie-types-int-dint-real",
		"exercise-scaling": "exercice-mise-a-l-echelle",
		"theory-structure": "theorie-sous-programmes",
		"exercise-subprograms": "exercice-sous-programmes",
		"synthesis-packing": "synthese-conditionnement",
		conclusion: "conclusion",
	},
	a4: {
		"theory-steps-ladder": "theorie-etapes-ladder",
		"exercise-grafcet-naive": "exercice-grafcet-naif",
		"theory-method-ladder": "theorie-methode-ladder",
		"theory-two-programs": "theorie-deux-programmes",
		"exercise-grafcet-linear": "exercice-grafcet-lineaire",
		"theory-actions-ladder": "theorie-actions-ladder",
		"theory-edge-actions-ladder": "theorie-actions-sur-front-ladder",
		"theory-receptivity-timer": "theorie-temporisation-receptivite",
		"theory-movement-supervision": "theorie-surveillance-mouvement",
		"synthesis-drilling": "synthese-percage",
		conclusion: "conclusion",
	},
	a5: {
		"theory-or-divergence-ladder": "theorie-divergence-en-ou-ladder",
		"exercise-grafcet-or-divergence": "exercice-grafcet-divergence-en-ou",
		"theory-and-divergence-ladder": "theorie-divergence-en-et-ladder",
		"exercise-grafcet-and-divergence": "exercice-grafcet-divergence-en-et",
		"theory-grafcet-reset": "theorie-grafcet-reinitialisation",
		"exercise-grafcet-reset": "exercice-grafcet-reinitialisation",
		"synthesis-parking": "synthese-parking",
		"theory-going-further": "theorie-limites-reseau-par-transition",
		"theory-three-blocks": "theorie-methode-trois-blocs",
		conclusion: "conclusion",
	},
};

/** English slugs of the steps whose id does not name their topic. */
const EN_STEP_SLUGS: {
	[M in TrainingModuleId]: Partial<Record<StepIdOf<StepIds[M]>, string>>;
} = {
	a0: {},
	a1: { theory: "steps-transitions-conditions" },
	a2: {},
	a3: {
		"theory-types": "theory-int-dint-real-types",
		"theory-structure": "theory-subprograms",
	},
	a4: {},
	a5: {},
};

/** Spanish slugs of every training step (ASCII, no accents). */
const ES_STEP_SLUGS: {
	[M in TrainingModuleId]: Record<StepIdOf<StepIds[M]>, string>;
} = {
	a0: {
		automatisme: "automatismo",
		"logic-basics": "logica-basica",
		"scan-cycle": "ciclo-de-escaneo",
		conclusion: "conclusion",
	},
	a1: {
		"grafcet-definition": "definicion-grafcet",
		theory: "etapas-transiciones-receptividades",
		"observe-linear": "observar-secuencia-lineal",
		"theory-actions": "teoria-acciones",
		"observe-actions": "observar-acciones",
		"exercise-linear": "ejercicio-secuencia-lineal",
		"theory-timer": "teoria-temporizacion",
		"observe-timer": "observar-temporizacion",
		"synthesis-traffic-light": "sintesis-semaforo",
		"theory-or-divergence": "teoria-divergencia-en-o",
		"exercise-or-divergence": "ejercicio-divergencia-en-o",
		"theory-and-divergence": "teoria-divergencia-en-y",
		"exercise-and-divergence": "ejercicio-divergencia-en-y",
		"synthesis-parking": "sintesis-aparcamiento",
		"synthesis-crossroads": "sintesis-cruce",
		"reading-errors": "lectura-de-errores",
	},
	a2: {
		"ladder-basics": "fundamentos-del-ladder",
		"theory-contacts-coils": "teoria-contactos-bobinas",
		"exercise-reading": "ejercicio-lectura",
		"exercise-logic": "ejercicio-logica",
		"theory-self-holding": "teoria-autorretencion",
		"exercise-self-holding": "ejercicio-autorretencion",
		"exercise-interlock": "ejercicio-enclavamiento",
		"theory-set-reset": "teoria-set-reset",
		"exercise-memory": "ejercicio-memoria",
		"theory-edges": "teoria-flancos",
		"exercise-edges-reading": "ejercicio-lectura-flancos",
		"exercise-toggle": "ejercicio-biestable",
		"synthesis-gate": "sintesis-porton",
		conclusion: "conclusion",
	},
	a3: {
		"theory-timers": "teoria-temporizadores",
		"exercise-timers-reading": "ejercicio-lectura-temporizadores",
		"exercise-timers": "ejercicio-temporizadores",
		"theory-counters": "teoria-contadores",
		"exercise-counters": "ejercicio-contadores",
		"theory-numeric": "teoria-magnitudes-numericas",
		"exercise-tank": "ejercicio-deposito",
		"theory-types": "teoria-tipos-int-dint-real",
		"exercise-scaling": "ejercicio-escalado",
		"theory-structure": "teoria-subprogramas",
		"exercise-subprograms": "ejercicio-subprogramas",
		"synthesis-packing": "sintesis-envasado",
		conclusion: "conclusion",
	},
	a4: {
		"theory-steps-ladder": "teoria-etapas-ladder",
		"exercise-grafcet-naive": "ejercicio-grafcet-ingenuo",
		"theory-method-ladder": "teoria-metodo-ladder",
		"theory-two-programs": "teoria-dos-programas",
		"exercise-grafcet-linear": "ejercicio-grafcet-lineal",
		"theory-actions-ladder": "teoria-acciones-ladder",
		"theory-edge-actions-ladder": "teoria-acciones-por-flanco-ladder",
		"theory-receptivity-timer": "teoria-temporizacion-receptividad",
		"theory-movement-supervision": "teoria-supervision-movimiento",
		"synthesis-drilling": "sintesis-taladrado",
		conclusion: "conclusion",
	},
	a5: {
		"theory-or-divergence-ladder": "teoria-divergencia-en-o-ladder",
		"exercise-grafcet-or-divergence": "ejercicio-grafcet-divergencia-en-o",
		"theory-and-divergence-ladder": "teoria-divergencia-en-y-ladder",
		"exercise-grafcet-and-divergence": "ejercicio-grafcet-divergencia-en-y",
		"theory-grafcet-reset": "teoria-grafcet-reinicializacion",
		"exercise-grafcet-reset": "ejercicio-grafcet-reinicializacion",
		"synthesis-parking": "sintesis-aparcamiento",
		"theory-going-further": "teoria-limites-red-por-transicion",
		"theory-three-blocks": "teoria-metodo-tres-bloques",
		conclusion: "conclusion",
	},
};

const SLUGS: Record<
	Locale,
	Record<TrainingModuleId, Record<string, string>>
> = {
	fr: FR_STEP_SLUGS,
	en: EN_STEP_SLUGS,
	es: ES_STEP_SLUGS,
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
