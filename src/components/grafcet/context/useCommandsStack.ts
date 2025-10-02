"use client";

import CommandsStack from "@/schemas/commands/CommandsStack.class";
import GrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { RefObject, useCallback, useRef } from "react";

export default function useCommandsStack(
	grafcet: Grafcet | null,
	setGrafcet: (g: Grafcet) => void
): {
	commandsStackRef: RefObject<CommandsStack<Grafcet>>;
	undoLastCommand: () => GrafcetCommand<any>[] | null;
	redoLastCommand: () => GrafcetCommand<any>[] | null;
} {
	const commandsStackRef = useRef<CommandsStack<Grafcet>>(new CommandsStack<Grafcet>(100));

	const undoLastCommand = useCallback(() => {
		if (!grafcet) return null;
		const [newGrafcet, commands] = commandsStackRef.current.undo(
			Object.assign(Object.create(Grafcet.prototype), { ...grafcet }) as Grafcet
		);
		if (newGrafcet) setGrafcet(newGrafcet);
		return commands;
	}, [grafcet, setGrafcet]);

	const redoLastCommand = useCallback(() => {
		if (!grafcet) return null;
		const [newGrafcet, commands] = commandsStackRef.current.redo(
			Object.assign(Object.create(Grafcet.prototype), grafcet) as Grafcet
		);
		if (newGrafcet) setGrafcet(newGrafcet);
		return commands;
	}, [grafcet, setGrafcet]);

	return { commandsStackRef, undoLastCommand, redoLastCommand };
}
