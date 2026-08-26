import CommandsStack from "@/schemas/commands/commands-stack.schema";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import AbstractCommandsStackManager from "@/ui/stores/shared/abstract-commands-stack.manager";
import { HmiStoreGetFunction, HmiStoreSetFunction } from "../hmi.store";

export default class CommandsStackManager extends AbstractCommandsStackManager<HmiPage> {
	private setStoreState: HmiStoreSetFunction;
	private getStoreState: HmiStoreGetFunction;

	/**
	 * La pile est fournie par le projet, pas créée ici : elle doit survivre à ce store, abandonné
	 * à la fermeture de la page HMI (voir `HmiManager.getCommandsStack`).
	 */
	constructor(setStoreState: HmiStoreSetFunction, getStoreState: HmiStoreGetFunction, commandsStack: CommandsStack<HmiPage>) {
		super(commandsStack);
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	protected getDomain(): HmiPage {
		return this.getStoreState().hmiPage.copy();
	}

	protected applyDomain(hmiPage: HmiPage): void {
		this.setStoreState(() => ({
			hmiPage,
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
	}
}
