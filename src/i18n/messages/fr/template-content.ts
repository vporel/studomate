import type { TemplateContent } from "@/i18n/messages/template-content.types";
import frTrafficLight from "./template-content/traffic-light.json";
import frCrossroads from "./template-content/crossroads.json";
import frDrilling from "./template-content/drilling.json";
import frElevator from "./template-content/elevator.json";
import frParking from "./template-content/parking.json";
import frCartonSorting from "./template-content/carton-sorting.json";
import frLinearSequence from "./template-content/linear-sequence.json";
import frAndDivergence from "./template-content/and-divergence.json";
import frOrDivergence from "./template-content/or-divergence.json";
import frTimerCycle from "./template-content/timer-cycle.json";
import frLadderAndOr from "./template-content/ladder-and-or.json";
import frLadderReading from "./template-content/ladder-reading.json";
import frLadderLogic from "./template-content/ladder-logic.json";
import frLadderSelfHolding from "./template-content/ladder-self-holding.json";
import frLadderInterlock from "./template-content/ladder-interlock.json";
import frLadderMemory from "./template-content/ladder-memory.json";
import frLadderEdgesReading from "./template-content/ladder-edges-reading.json";
import frLadderToggle from "./template-content/ladder-toggle.json";
import frLadderGate from "./template-content/ladder-gate.json";
import frLadderTimersReading from "./template-content/ladder-timers-reading.json";
import frLadderTimers from "./template-content/ladder-timers.json";
import frLadderCounters from "./template-content/ladder-counters.json";
import frLadderTank from "./template-content/ladder-tank.json";
import frLadderScaling from "./template-content/ladder-scaling.json";
import frLadderSubprograms from "./template-content/ladder-subprograms.json";
import frLadderPacking from "./template-content/ladder-packing.json";
import frLinearSequenceNaiveLadder from "./template-content/linear-sequence-naive-ladder.json";
import frLinearSequenceLadder from "./template-content/linear-sequence-ladder.json";
import frDrillingLadder from "./template-content/drilling-ladder.json";
import frOrDivergenceLadder from "./template-content/or-divergence-ladder.json";
import frAndDivergenceLadder from "./template-content/and-divergence-ladder.json";
import frTrafficLightLadder from "./template-content/traffic-light-ladder.json";
import frParkingLadder from "./template-content/parking-ladder.json";
import frGateGrafcetLadder from "./template-content/gate-grafcet-ladder.json";
import frGrafcetLadder from "./template-content/grafcet-ladder.json";

const frTemplateContent: Record<string, TemplateContent> = {
	"traffic-light": frTrafficLight,
	crossroads: frCrossroads,
	drilling: frDrilling,
	elevator: frElevator,
	parking: frParking,
	"carton-sorting": frCartonSorting,
	"linear-sequence": frLinearSequence,
	"and-divergence": frAndDivergence,
	"or-divergence": frOrDivergence,
	"timer-cycle": frTimerCycle,
	"ladder-and-or": frLadderAndOr,
	"ladder-reading": frLadderReading,
	"ladder-logic": frLadderLogic,
	"ladder-self-holding": frLadderSelfHolding,
	"ladder-interlock": frLadderInterlock,
	"ladder-memory": frLadderMemory,
	"ladder-edges-reading": frLadderEdgesReading,
	"ladder-toggle": frLadderToggle,
	"ladder-gate": frLadderGate,
	"ladder-timers-reading": frLadderTimersReading,
	"ladder-timers": frLadderTimers,
	"ladder-counters": frLadderCounters,
	"ladder-tank": frLadderTank,
	"ladder-scaling": frLadderScaling,
	"ladder-subprograms": frLadderSubprograms,
	"ladder-packing": frLadderPacking,
	"linear-sequence-naive-ladder": frLinearSequenceNaiveLadder,
	"linear-sequence-ladder": frLinearSequenceLadder,
	"drilling-ladder": frDrillingLadder,
	"or-divergence-ladder": frOrDivergenceLadder,
	"and-divergence-ladder": frAndDivergenceLadder,
	"traffic-light-ladder": frTrafficLightLadder,
	"parking-ladder": frParkingLadder,
	"gate-grafcet-ladder": frGateGrafcetLadder,
	"grafcet-ladder": frGrafcetLadder,
};

export default frTemplateContent;
