/**
 * Identifiants stables des étapes de A0 (voir `StepData.id`, `ModuleStepper.tsx`) : source
 * unique, réutilisée par `a0/steps.ts` (contenu) et `training-module-step-ids.ts` (savoir si
 * le module est achevé, via la reprise de progression).
 */
const A0_STEP_IDS = {
	automatisme: "automatisme",
	logicBasics: "logic-basics",
	scanCycle: "scan-cycle",
	conclusion: "conclusion",
} as const;

export default A0_STEP_IDS;
