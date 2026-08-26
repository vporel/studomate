import { ElementType } from "../element.schema";
import Grafcet from "../grafcet.schema";
import { Dimensions, XYPosition } from "../shared-types";
import AbstractGrafcetCommand from "./abstract-grafcet.command";

export default class ElementsRemoveCommand extends AbstractGrafcetCommand<
	{
		type: ElementType;
		id: string;
		data: any;
		position: XYPosition;
		size: Dimensions;
	}[]
> {
	getType(): string {
		return "grafcet-elements-remove";
	}

	execute(grafcet: Grafcet): [grafcet: Grafcet, isCommandValid: boolean] {
		grafcet.removeElements(
			this.payload.map((e) => ({
				type: e.type,
				id: e.id,
			})),
		);
		return [grafcet, true];
	}

	cancel(grafcet: Grafcet): Grafcet {
		grafcet.addElements(
			this.payload.map((e) => ({
				type: e.type,
				id: e.id,
				data: e.data,
				position: e.position,
				size: e.size,
			})),
		);
		return grafcet;
	}
}
