"use client";

import CommandsStack from "@/schemas/commands/CommandsStack.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import ConnectionsRemoveCommand from "@/schemas/grafcet/commands/ConnectionsRemoveCommand.class";
import ConnectionsUpdateCommand from "@/schemas/grafcet/commands/ConnectionsUpdateCommand.class";
import ElementsAddCommand from "@/schemas/grafcet/commands/ElementsAddCommand.class";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/ElementsRemoveCommand.class";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/ElementsUpdateCommand.class";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useEffect } from "react";
import {
	GrafcetElementsEvents,
	GrafcetElementsEventsAddData,
	GrafcetElementsEventsRemoveData,
	GrafcetElementsEventsUpdateData,
} from "./elements-events";

export default function useElementsEventsHandler(
	elementsEvents: Emitter<GrafcetElementsEvents>,
	grafcet: Grafcet,
	setGrafcet: Dispatch<SetStateAction<Grafcet>>,
	commandsStack: CommandsStack<Grafcet>
) {
	//add event
	useEffect(() => {
		const handler = (nodes: GrafcetElementsEventsAddData[]) => {
			const newGrafcet = commandsStack.execute(
				[
					new ElementsAddCommand(
						nodes.map((node) => ({
							type: node.type,
							id: node.id,
							data: node.data,
							position: node.position,
						}))
					),
				],
				grafcet.copy()
			);
			setGrafcet(newGrafcet);
		};
		elementsEvents.on("add", handler);
		return () => {
			elementsEvents.off("add", handler);
		};
	}, [elementsEvents, grafcet, setGrafcet, commandsStack]);

	//update event
	useEffect(() => {
		const handler = ({
			elements,
			connections,
		}: {
			elements: GrafcetElementsEventsUpdateData[];
			connections?: GrafcetConnection[];
		}) => {
			const newGrafcet = commandsStack.execute(
				[
					new ElementsUpdateCommand(
						elements.map((e) => ({
							type: e.type,
							id: e.id,
							data: e.data,
							position: e.position,
							previousData: e.data ? grafcet.getElement(e.type, e.id)?.data || {} : undefined,
							previousPosition: e.position
								? grafcet.getElement(e.type, e.id)?.position || {
										x: 0,
										y: 0,
								  }
								: undefined,
						}))
					),

					new ConnectionsUpdateCommand(
						(connections || []).map((c) => {
							const previous = grafcet.getConnection(c.source.id, c.target.id);
							if (!previous) throw new Error("Previous connection not found");
							return { connection: c, previous };
						})
					),
				],
				grafcet.copy()
			);
			setGrafcet(newGrafcet);
		};
		elementsEvents.on("update", handler);
		return () => {
			elementsEvents.off("update", handler);
		};
	}, [elementsEvents, grafcet, setGrafcet, commandsStack]);

	//remove event
	useEffect(() => {
		const handler = ({
			elements,
			connections,
		}: {
			elements: GrafcetElementsEventsRemoveData[];
			connections?: GrafcetConnection[];
		}) => {
			const newGrafcet = commandsStack.execute(
				[
					new ElementsRemoveCommand(
						elements.map((e) => ({
							type: e.type,
							id: e.id,
							data: e.data,
							position: e.position,
						}))
					),
					new ConnectionsRemoveCommand(connections || []),
				],
				grafcet.copy()
			);
			setGrafcet(newGrafcet);
		};
		elementsEvents.on("remove", handler);
		return () => {
			elementsEvents.off("remove", handler);
		};
	}, [elementsEvents, grafcet, setGrafcet, commandsStack]);
}
