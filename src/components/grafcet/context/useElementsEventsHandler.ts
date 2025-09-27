"use client";

import CommandsStack from "@/schemas/commands/CommandsStack.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import ElementsAddCommand from "@/schemas/grafcet/commands/ElementsAddCommand.class";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/ElementsRemoveCommand.class";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/ElementsUpdateCommand.class";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useEffect } from "react";
import { GrafcetNode } from "../flow/grafcet-nodes-definitions";
import { GrafcetElementsEvents } from "./GrafcetContext";

export default function useElementsEventsHandler(
	elementsEvents: Emitter<GrafcetElementsEvents>,
	grafcet: Grafcet | null,
	setGrafcet: Dispatch<SetStateAction<Grafcet | null>>,
	commandsStack: CommandsStack<Grafcet>
) {
	//add event
	useEffect(() => {
		const handler = (nodes: GrafcetNode[]) => {
			if (!grafcet) {
				throw new Error("Grafcet is null");
				return;
			}
			const newGrafcet = commandsStack.execute(
				new ElementsAddCommand(
					nodes.map((node) => ({
						type: node.type,
						id: node.id,
						data: node.data,
						position: node.position,
					}))
				),
				Object.assign(Object.create(Grafcet.prototype), grafcet) as Grafcet
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
		const handler = (nodes: GrafcetNode[]) => {
			if (!grafcet) {
				throw new Error("Grafcet is null");
				return;
			}
			const newGrafcet = commandsStack.execute(
				new ElementsUpdateCommand(
					nodes.map((node) => ({
						type: node.type,
						id: node.id,
						data: node.data,
						position: node.position,
						previousData: grafcet.getElement(node.type, node.id)?.data || {},
						previousPosition: grafcet.getElement(node.type, node.id)?.position || {
							x: 0,
							y: 0,
						},
					}))
				),
				Object.assign(Object.create(Grafcet.prototype), grafcet) as Grafcet
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
		const handler = (nodes: GrafcetNode[]) => {
			if (!grafcet) {
				throw new Error("Grafcet is null");
				return;
			}
			const newGrafcet = commandsStack.execute(
				new ElementsRemoveCommand(
					nodes.map((node) => ({
						type: node.type,
						id: node.id,
						data: node.data,
						position: node.position,
					}))
				),
				Object.assign(Object.create(Grafcet.prototype), grafcet) as Grafcet
			);
			setGrafcet(newGrafcet);
		};
		elementsEvents.on("remove", handler);
		return () => {
			elementsEvents.off("remove", handler);
		};
	}, [elementsEvents, grafcet, setGrafcet, commandsStack]);
}
