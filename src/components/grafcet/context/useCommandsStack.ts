"use client";

import CommandsStack from "@/schemas/commands/CommandsStack.class";
import AbstractGrafcetCommand from "@/schemas/grafcet/commands/AbstractGrafcetCommand.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { RefObject, useCallback, useRef } from "react";

export default function useCommandsStack(
	grafcet: Grafcet,
	setGrafcet: (g: Grafcet) => void
): {
	commandsStackRef: RefObject<CommandsStack<Grafcet>>;
	undoLastCommand: () => AbstractGrafcetCommand<any>[] | null;
	redoLastCommand: () => AbstractGrafcetCommand<any>[] | null;
} {
	const commandsStackRef = useRef<CommandsStack<Grafcet>>(new CommandsStack<Grafcet>(100));

	const undoLastCommand = useCallback(() => {
		const [newGrafcet, commands] = commandsStackRef.current.undo(grafcet.copy());
		if (commands) setGrafcet(newGrafcet);
		return commands;
	}, [grafcet, setGrafcet]);

	const redoLastCommand = useCallback(() => {
		const [newGrafcet, commands] = commandsStackRef.current.redo(grafcet.copy());
		if (commands) setGrafcet(newGrafcet);
		return commands;
	}, [grafcet, setGrafcet]);

	return { commandsStackRef, undoLastCommand, redoLastCommand };
}
