import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import AbstractCommandsStackManager from "@/ui/stores/shared/abstract-commands-stack.manager";
import {
	LadderStoreGetFunction,
	LadderStoreSetFunction,
} from "../ladder.store";
import syncLadderViewState from "../ladder-view-state";

export default class LadderCommandsStackManager extends AbstractCommandsStackManager<Ladder> {
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;

	/**
	 * The stack is provided by the project, not created here: it must outlive this store,
	 * which is dropped when the ladder page is closed.
	 */
	constructor(
		setStoreState: LadderStoreSetFunction,
		getStoreState: LadderStoreGetFunction,
		commandsStack: CommandsStack<Ladder>,
	) {
		super(commandsStack);
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	protected getDomain(): Ladder {
		return this.getStoreState().ladder.copy();
	}

	/** Adopts the ladder produced by the commands stack and realigns the view on it. */
	protected applyDomain(ladder: Ladder): void {
		this.setStoreState((state) => ({
			...syncLadderViewState(state, ladder),
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
	}
}
