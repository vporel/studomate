import Grafcet, { XYPosition } from "../Grafcet.class";
import { GrafcetElementType } from "../GrafcetElement.class";
import AbstractGrafcetCommand from "./AbstractGrafcetCommand.class";

export default class ElementsAddCommand extends AbstractGrafcetCommand<
	{
		type: GrafcetElementType;
		id: string;
		data: any;
		position: XYPosition;
	}[]
> {
	getType(): string {
		return "elements-add";
	}

	execute(grafcet: Grafcet): [grafcet: Grafcet, isCommandValid: boolean] {
		grafcet.addElements(
			this.payload.map((e) => ({
				type: e.type,
				id: e.id,
				data: e.data,
				position: e.position,
			}))
		);
		return [grafcet, true];
	}

	cancel(grafcet: Grafcet): Grafcet {
		grafcet.removeElements(
			this.payload.map((e) => ({
				type: e.type,
				id: e.id,
			}))
		);
		return grafcet;
	}
}
