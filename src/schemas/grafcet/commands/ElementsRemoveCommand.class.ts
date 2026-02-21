import Grafcet, { XYPosition } from "../Grafcet.class";
import { GrafcetElementType } from "../GrafcetElement.class";
import AbstractGrafcetCommand from "./AbstractGrafcetCommand.class";

export default class ElementsRemoveCommand extends AbstractGrafcetCommand<
	{
		type: GrafcetElementType;
		id: string;
		data: any;
		position: XYPosition;
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
			})),
		);
		return grafcet;
	}
}
