import { validateBlockName } from "@/schemas/ladder/function-blocks/function-block.schema";
import {
	createCounterBlockVariables,
	getCounterBlockParams,
} from "@/schemas/ladder/function-blocks/counter.schema";
import {
	createTimerBlockVariables,
	getTimerBlockParams,
} from "@/schemas/ladder/function-blocks/timer.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";

/**
 * The `<Name>.IN/.Q/.ET`, `<Name>.CV`/`.QD`... variables exposed by every timer/counter block
 * instance in the project (see `createTimerBlockVariables`/`createCounterBlockVariables`),
 * synthesized here for the UI (variable selectors) the same way `LadderAnalyser` synthesizes them
 * for analysis — they are never persisted in `project.variables`, and a block instance is
 * referenceable from any ladder or grafcet in the project, not just the one that contains it.
 * A block whose name fails `validateBlockName` is skipped: the analyser reports the name error
 * itself, there is no valid variable to expose yet.
 */
export function getBlockInstanceVariables(project: Project): Variable[] {
	const timerVariables = project.getAllTimerBlockElements().flatMap(({ element }) => {
		const params = getTimerBlockParams(element);
		if (!params || validateBlockName(params.name).length > 0) return [];
		return createTimerBlockVariables(element.id, params.name);
	});
	const counterVariables = project.getAllCounterBlockElements().flatMap(({ element }) => {
		const params = getCounterBlockParams(element);
		if (!params || validateBlockName(params.name).length > 0) return [];
		return createCounterBlockVariables(element.id, params.name, params.counterType);
	});
	return [...timerVariables, ...counterVariables];
}
