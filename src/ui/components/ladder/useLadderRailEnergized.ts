import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";

/** The power rail and its stubs carry current permanently while the ladder is simulated. */
export default function useLadderRailEnergized(): boolean {
	const simulating = useProjectStore(
		(state) => state.mode === ProjectMode.SIMULATION,
	);
	const excludedFromExecution = useLadderStore(
		(state) => state.ladder.excludedFromExecution,
	);
	return simulating && !excludedFromExecution;
}
