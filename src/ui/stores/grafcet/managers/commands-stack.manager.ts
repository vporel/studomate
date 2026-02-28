import CommandsStack from "@/schemas/commands/commands-stack.schema";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/abstract-grafcet.command";
import ConnectionsAddCommand from "@/schemas/grafcet/commands/connections-add.command";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/connections-remove.command";
import ConnectionsUpdateCommand from "@/schemas/grafcet/commands/connections-update.command";
import ElementsAddCommand from "@/schemas/grafcet/commands/elements-add.command";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/elements-remove.command";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/elements-update.command";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { GrafcetStoreGetFunction, GrafcetStoreSetFunction } from "../grafcet.store";

export default class CommandsStackManager {
	private static COMMANDS_STACK_SIZE = 100;
	private commandsStack: CommandsStack<Grafcet>;
	private setStoreState: GrafcetStoreSetFunction;
	private getStoreState: GrafcetStoreGetFunction;

	constructor(setStoreState: GrafcetStoreSetFunction, getStoreState: GrafcetStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
		this.commandsStack = new CommandsStack<Grafcet>(CommandsStackManager.COMMANDS_STACK_SIZE);
	}

	executeOperation(commands: AbstractGrafcetCommand<any>[]): void {
		this.getStoreState().viewManager.throwErrorIfNotReady();
		if (!commands || commands.length === 0) return;
		console.log("Executing grafcet operation with commands: ", commands);
		const newGrafcet = this.commandsStack.execute(commands, this.getStoreState().grafcet.copy());
		this.setStoreState(() => ({
			grafcet: newGrafcet,
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
	}

	undoOperation(): void {
		this.getStoreState().viewManager.throwErrorIfNotReady();
		const [newGrafcet, commands] = this.commandsStack.undo(this.getStoreState().grafcet.copy());
		if (!commands) return;
		this.setStoreState(() => ({
			grafcet: newGrafcet,
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
		commands?.forEach((command) => this.commandUndo(command));
	}

	redoOperation(): void {
		this.getStoreState().viewManager.throwErrorIfNotReady();
		const [newGrafcet, commands] = this.commandsStack.redo(this.getStoreState().grafcet.copy());
		if (!commands) return;
		this.setStoreState(() => ({
			grafcet: newGrafcet,
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
		commands?.forEach((command) => this.commandRedo(command));
	}

	private commandUndo(command: AbstractGrafcetCommand<any>): void {
		if (!command) return;
		if (command instanceof ElementsAddCommand) {
			this.setStoreState(({ nodes }) => ({
				nodes: nodes?.filter((n) => command.payload.findIndex((e) => e.id === n.id) === -1),
			}));
		} else if (command instanceof ElementsUpdateCommand) {
			this.setStoreState(({ nodes }) => ({
				nodes: nodes?.map((n) => {
					const index = command.payload.findIndex((e) => e.id === n.id);
					if (index === -1) return n;
					return {
						...n,
						width:
							command.payload[index].previousData?.width !== undefined
								? command.payload[index].previousData.width
								: n.width,
						height:
							command.payload[index].previousData?.height !== undefined
								? command.payload[index].previousData.height
								: n.height,
						data: { ...n.data, ...command.payload[index].previousData },
						position: { ...n.position, ...command.payload[index].previousPosition },
					} as any;
				}),
			}));
		} else if (command instanceof ElementsRemoveCommand) {
			this.setStoreState(({ nodes }) => ({ nodes: [...nodes!, ...command.payload] }));
		} else if (command instanceof ConnectionsAddCommand) {
			if (command.payload.length === 0) return;
			this.setStoreState(({ edges }) => ({
				edges: edges?.filter((e) => command.payload.findIndex((c) => c.id === e.id) === -1),
			}));
		} else if (command instanceof ConnectionsUpdateCommand) {
			if (command.payload.length === 0) return;
			this.setStoreState(({ edges }) => ({
				edges: edges?.map((e) => {
					const index = command.payload.findIndex((c) => c.connection.id === e.id);
					if (index === -1) return e;
					return {
						...e,
						data: { ...e.data, ...command.payload[index].previous.data },
					};
				}),
			}));
		} else if (command instanceof ConnectionsRemoveCommand) {
			if (command.payload.length === 0) return;
			this.setStoreState(({ edges }) => ({
				edges: [
					...edges!,
					...command.payload.map(
						(c) =>
							({
								type: "custom-edge",
								id: c.id,
								source: c.source.id,
								sourceHandle: c.source.handle,
								target: c.target.id,
							}) as any,
					),
				],
			}));
		}
	}

	private commandRedo(command: AbstractGrafcetCommand<any>): void {
		if (!command) return;
		if (command instanceof ElementsAddCommand) {
			this.setStoreState(({ nodes }) => ({ nodes: [...nodes!, ...command.payload] }));
		} else if (command instanceof ElementsUpdateCommand) {
			this.setStoreState(({ nodes }) => ({
				nodes: nodes?.map((n) => {
					const node = command.payload.findIndex((e) => e.id === n.id);
					if (node === -1) return n;
					return {
						...n,
						width: command.payload[node].data?.width || n.width,
						height: command.payload[node].data?.height || n.height,
						data: { ...n.data, ...command.payload[node].data },
						position: { ...n.position, ...command.payload[node].position },
					} as any;
				}),
			}));
		} else if (command instanceof ElementsRemoveCommand) {
			this.setStoreState(({ nodes }) => ({
				nodes: nodes?.filter((n) => command.payload.findIndex((e) => e.id === n.id) === -1),
			}));
		} else if (command instanceof ConnectionsAddCommand) {
			if (command.payload.length === 0) return;
			this.setStoreState(({ edges }) => ({
				edges: [
					...edges!,
					...command.payload.map(
						(c) =>
							({
								type: "custom-edge",
								id: c.id,
								source: c.source.id,
								sourceHandle: c.source.handle,
								target: c.target.id,
								targetHandle: c.target.handle,
								data: c.data,
							}) as any,
					),
				],
			}));
		} else if (command instanceof ConnectionsUpdateCommand) {
			if (command.payload.length === 0) return;
			this.setStoreState(({ edges }) => ({
				edges: edges?.map((e) => {
					const index = command.payload.findIndex((c) => c.connection.id === e.id);
					if (index === -1) return e;
					return {
						...e,
						data: { ...e.data, ...command.payload[index].connection.data },
					};
				}),
			}));
		} else if (command instanceof ConnectionsRemoveCommand) {
			if (command.payload.length === 0) return;
			this.setStoreState(({ edges }) => ({
				edges: edges?.filter((e) => command.payload.findIndex((c) => c.id === e.id) === -1),
			}));
		}
	}
}
