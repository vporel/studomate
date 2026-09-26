import { ElementType } from "../element.schema";
import Grafcet from "../grafcet.schema";
import { Dimensions, XYPosition } from "../shared-types";
import AbstractGrafcetCommand from "./abstract-grafcet.command";

export type ElementsCommandPayload = {
	type: ElementType;
	id: string;
	data: any;
	position: XYPosition;
	size: Dimensions;
}[];

/** Base of the add/remove element commands: each one is the exact inverse of the other. */
export default abstract class AbstractElementsCommand extends AbstractGrafcetCommand<ElementsCommandPayload> {
	protected addPayloadElements(grafcet: Grafcet): void {
		grafcet.addElements(
			this.payload.map((e) => ({
				type: e.type,
				id: e.id,
				data: e.data,
				position: e.position,
				size: e.size,
			})),
		);
	}

	protected removePayloadElements(grafcet: Grafcet): void {
		grafcet.removeElements(
			this.payload.map((e) => ({
				type: e.type,
				id: e.id,
			})),
		);
	}
}
