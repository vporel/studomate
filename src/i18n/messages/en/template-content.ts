import type { TemplateContent } from "@/i18n/messages/template-content.types";
import enTrafficLight from "./template-content/traffic-light.json";
import enCrossroads from "./template-content/crossroads.json";
import enDrilling from "./template-content/drilling.json";
import enElevator from "./template-content/elevator.json";
import enParking from "./template-content/parking.json";
import enCartonSorting from "./template-content/carton-sorting.json";
import enLinearSequence from "./template-content/linear-sequence.json";
import enAndDivergence from "./template-content/and-divergence.json";
import enOrDivergence from "./template-content/or-divergence.json";
import enTimerCycle from "./template-content/timer-cycle.json";
import enLadderAndOr from "./template-content/ladder-and-or.json";
import enLadderReading from "./template-content/ladder-reading.json";
import enLadderLogic from "./template-content/ladder-logic.json";
import enLadderSelfHolding from "./template-content/ladder-self-holding.json";
import enLadderInterlock from "./template-content/ladder-interlock.json";
import enLadderMemory from "./template-content/ladder-memory.json";
import enLadderEdgesReading from "./template-content/ladder-edges-reading.json";
import enLadderToggle from "./template-content/ladder-toggle.json";
import enLadderGate from "./template-content/ladder-gate.json";
import enLadderTimersReading from "./template-content/ladder-timers-reading.json";
import enLadderTimers from "./template-content/ladder-timers.json";
import enLadderCounters from "./template-content/ladder-counters.json";
import enLadderTank from "./template-content/ladder-tank.json";
import enLadderScaling from "./template-content/ladder-scaling.json";
import enLadderSubprograms from "./template-content/ladder-subprograms.json";
import enLadderPacking from "./template-content/ladder-packing.json";
import enLinearSequenceNaiveLadder from "./template-content/linear-sequence-naive-ladder.json";
import enLinearSequenceLadder from "./template-content/linear-sequence-ladder.json";
import enDrillingLadder from "./template-content/drilling-ladder.json";
import enOrDivergenceLadder from "./template-content/or-divergence-ladder.json";
import enAndDivergenceLadder from "./template-content/and-divergence-ladder.json";
import enTrafficLightLadder from "./template-content/traffic-light-ladder.json";
import enParkingLadder from "./template-content/parking-ladder.json";
import enGateGrafcetLadder from "./template-content/gate-grafcet-ladder.json";
import enGrafcetLadder from "./template-content/grafcet-ladder.json";

const enTemplateContent: Record<string, TemplateContent> = {
	"traffic-light": enTrafficLight,
	crossroads: enCrossroads,
	drilling: enDrilling,
	elevator: enElevator,
	parking: enParking,
	"carton-sorting": enCartonSorting,
	"linear-sequence": enLinearSequence,
	"and-divergence": enAndDivergence,
	"or-divergence": enOrDivergence,
	"timer-cycle": enTimerCycle,
	"ladder-and-or": enLadderAndOr,
	"ladder-reading": enLadderReading,
	"ladder-logic": enLadderLogic,
	"ladder-self-holding": enLadderSelfHolding,
	"ladder-interlock": enLadderInterlock,
	"ladder-memory": enLadderMemory,
	"ladder-edges-reading": enLadderEdgesReading,
	"ladder-toggle": enLadderToggle,
	"ladder-gate": enLadderGate,
	"ladder-timers-reading": enLadderTimersReading,
	"ladder-timers": enLadderTimers,
	"ladder-counters": enLadderCounters,
	"ladder-tank": enLadderTank,
	"ladder-scaling": enLadderScaling,
	"ladder-subprograms": enLadderSubprograms,
	"ladder-packing": enLadderPacking,
	"linear-sequence-naive-ladder": enLinearSequenceNaiveLadder,
	"linear-sequence-ladder": enLinearSequenceLadder,
	"drilling-ladder": enDrillingLadder,
	"or-divergence-ladder": enOrDivergenceLadder,
	"and-divergence-ladder": enAndDivergenceLadder,
	"traffic-light-ladder": enTrafficLightLadder,
	"parking-ladder": enParkingLadder,
	"gate-grafcet-ladder": enGateGrafcetLadder,
	"grafcet-ladder": enGrafcetLadder,
};

export default enTemplateContent;
