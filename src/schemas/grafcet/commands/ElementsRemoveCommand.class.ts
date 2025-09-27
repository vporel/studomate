import Grafcet from "../Grafcet.class";
import { GrafcetElementType, XYPosition } from "../GrafcetElement.class";
import GrafcetCommand from "./AbstractGrafcetCommand.class";

export default class ElementsRemoveCommand extends GrafcetCommand<
	{
		type: GrafcetElementType;
		id: string;
		data: any;
		position: XYPosition;
	}[]
> {
	getType(): string {
		return "elements-remove";
	}

	execute(grafcet: Grafcet): Grafcet {
		grafcet.removeElements(
			this.payload.map((e) => ({
				type: e.type,
				id: e.id,
			}))
		);
		return grafcet;
	}

	cancel(grafcet: Grafcet): Grafcet {
		grafcet.addElements(
			this.payload.map((e) => ({
				type: e.type,
				id: e.id,
				data: e.data,
				position: e.position,
			}))
		);
		return grafcet;
	}
}
