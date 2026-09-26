/**
 * Identifiants stables des étapes de A2 (voir `StepData.id`, `ModuleStepper.tsx`) : source
 * unique, réutilisée par `a2/page.tsx` (contenu) et `../page.tsx` (savoir si le module est
 * achevé, via la reprise de progression).
 */
const A2_STEP_IDS = {
	ladderBasics: "ladder-basics",
	theoryContactsCoils: "theory-contacts-coils",
	exerciseReading: "exercise-reading",
	exerciseLogic: "exercise-logic",
	theorySelfHolding: "theory-self-holding",
	exerciseSelfHolding: "exercise-self-holding",
	exerciseInterlock: "exercise-interlock",
	theorySetReset: "theory-set-reset",
	exerciseMemory: "exercise-memory",
	theoryEdges: "theory-edges",
	exerciseEdgesReading: "exercise-edges-reading",
	exerciseToggle: "exercise-toggle",
	synthesisGate: "synthesis-gate",
	conclusion: "conclusion",
} as const;

export default A2_STEP_IDS;
