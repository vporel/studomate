import { ElementType } from "./element.schema";
import Junction, {
	JUNCTION_HANDLE_PIVOT,
	JunctionHandle,
} from "./junction.schema";

export const JUNCTION_OR_END_HANDLE_PIVOT_TYPES = [
	"step",
] as const satisfies readonly ElementType[];

export const JUNCTION_OR_END_HANDLES_TO_TYPES: Record<
	JunctionHandle,
	readonly ElementType[]
> = {
	[JUNCTION_HANDLE_PIVOT]: JUNCTION_OR_END_HANDLE_PIVOT_TYPES,
};

/**
 * Special case for branches handles
 * We don't have a handle name "branch", because the user can add many branches
 * So, for each branch, we will create a specific unpredictable id
 * Nevertheless, we specify here the element types that can be connected to these branch handles
 */
export const JUNCTION_OR_END_HANDLE_BRANCH_TYPES = [
	"transition",
] as const satisfies readonly ElementType[];

export default class JunctionOrEnd extends Junction {
	readonly type = "junction-or-end";
}
