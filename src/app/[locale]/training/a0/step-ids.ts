/**
 * Identifiants stables des étapes de A0 (voir `StepData.id`, `ModuleStepper.tsx`) — source
 * unique, réutilisée par `a0/page.tsx` (contenu) et `../page.tsx` (savoir si le module est
 * achevé, via la reprise de progression) pour ne jamais désynchroniser les deux.
 */
const A0_STEP_IDS = {
	automatisme: "automatisme",
	logicBasics: "logic-basics",
	scanCycle: "scan-cycle",
} as const;

export default A0_STEP_IDS;
