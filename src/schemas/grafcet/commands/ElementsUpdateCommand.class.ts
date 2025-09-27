import Grafcet, { XYPosition } from "../Grafcet.class";
import { GrafcetElementType } from "../GrafcetElement.class";
import GrafcetCommand from "./AbstractGrafcetCommand.class";

export default class ElementsUpdateCommand extends GrafcetCommand<
	{
		type: GrafcetElementType;
		id: string;
		data: any;
		previousData: any;
		position: XYPosition;
		previousPosition: XYPosition;
	}[]
> {
	getType(): string {
		return "elements-update";
	}

	execute(grafcet: Grafcet): Grafcet {
		grafcet.updateElements(
			this.payload.map((e) => ({
				type: e.type,
				id: e.id,
				data: e.data,
				position: e.position,
			}))
		);
		return grafcet;
	}

	cancel(grafcet: Grafcet): Grafcet {
		grafcet.updateElements(
			this.payload.map((e) => ({
				type: e.type,
				id: e.id,
				data: e.previousData,
				position: e.previousPosition,
			}))
		);
		return grafcet;
	}
}
