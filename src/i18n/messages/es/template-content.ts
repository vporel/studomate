import type { TemplateContent } from "@/i18n/messages/template-content.types";
import esTrafficLight from "./template-content/traffic-light.json";
import esCrossroads from "./template-content/crossroads.json";
import esDrilling from "./template-content/drilling.json";
import esElevator from "./template-content/elevator.json";
import esParking from "./template-content/parking.json";
import esCartonSorting from "./template-content/carton-sorting.json";
import esLinearSequence from "./template-content/linear-sequence.json";
import esAndDivergence from "./template-content/and-divergence.json";
import esOrDivergence from "./template-content/or-divergence.json";
import esTimerCycle from "./template-content/timer-cycle.json";
import esLadderAndOr from "./template-content/ladder-and-or.json";
import esLadderReading from "./template-content/ladder-reading.json";
import esLadderLogic from "./template-content/ladder-logic.json";
import esLadderSelfHolding from "./template-content/ladder-self-holding.json";
import esLadderInterlock from "./template-content/ladder-interlock.json";
import esLadderMemory from "./template-content/ladder-memory.json";
import esLadderEdgesReading from "./template-content/ladder-edges-reading.json";
import esLadderToggle from "./template-content/ladder-toggle.json";
import esLadderGate from "./template-content/ladder-gate.json";
import esLadderTimersReading from "./template-content/ladder-timers-reading.json";
import esLadderTimers from "./template-content/ladder-timers.json";
import esLadderCounters from "./template-content/ladder-counters.json";
import esLadderTank from "./template-content/ladder-tank.json";
import esLadderScaling from "./template-content/ladder-scaling.json";
import esLadderSubprograms from "./template-content/ladder-subprograms.json";
import esLadderPacking from "./template-content/ladder-packing.json";
import esLinearSequenceNaiveLadder from "./template-content/linear-sequence-naive-ladder.json";
import esLinearSequenceLadder from "./template-content/linear-sequence-ladder.json";
import esDrillingLadder from "./template-content/drilling-ladder.json";
import esOrDivergenceLadder from "./template-content/or-divergence-ladder.json";
import esAndDivergenceLadder from "./template-content/and-divergence-ladder.json";
import esTrafficLightLadder from "./template-content/traffic-light-ladder.json";
import esParkingLadder from "./template-content/parking-ladder.json";
import esGateGrafcetLadder from "./template-content/gate-grafcet-ladder.json";
import esGatePerTransitionLadder from "./template-content/gate-per-transition-ladder.json";
import esGrafcetLadder from "./template-content/grafcet-ladder.json";

const esTemplateContent: Record<string, TemplateContent> = {
	"traffic-light": esTrafficLight,
	crossroads: esCrossroads,
	drilling: esDrilling,
	elevator: esElevator,
	parking: esParking,
	"carton-sorting": esCartonSorting,
	"linear-sequence": esLinearSequence,
	"and-divergence": esAndDivergence,
	"or-divergence": esOrDivergence,
	"timer-cycle": esTimerCycle,
	"ladder-and-or": esLadderAndOr,
	"ladder-reading": esLadderReading,
	"ladder-logic": esLadderLogic,
	"ladder-self-holding": esLadderSelfHolding,
	"ladder-interlock": esLadderInterlock,
	"ladder-memory": esLadderMemory,
	"ladder-edges-reading": esLadderEdgesReading,
	"ladder-toggle": esLadderToggle,
	"ladder-gate": esLadderGate,
	"ladder-timers-reading": esLadderTimersReading,
	"ladder-timers": esLadderTimers,
	"ladder-counters": esLadderCounters,
	"ladder-tank": esLadderTank,
	"ladder-scaling": esLadderScaling,
	"ladder-subprograms": esLadderSubprograms,
	"ladder-packing": esLadderPacking,
	"linear-sequence-naive-ladder": esLinearSequenceNaiveLadder,
	"linear-sequence-ladder": esLinearSequenceLadder,
	"drilling-ladder": esDrillingLadder,
	"or-divergence-ladder": esOrDivergenceLadder,
	"and-divergence-ladder": esAndDivergenceLadder,
	"traffic-light-ladder": esTrafficLightLadder,
	"parking-ladder": esParkingLadder,
	"gate-grafcet-ladder": esGateGrafcetLadder,
	"gate-per-transition-ladder": esGatePerTransitionLadder,
	"grafcet-ladder": esGrafcetLadder,
};

export default esTemplateContent;
