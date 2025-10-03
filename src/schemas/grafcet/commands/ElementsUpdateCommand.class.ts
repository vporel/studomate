import Grafcet, { XYPosition } from "../Grafcet.class";
import { GrafcetElementType } from "../GrafcetElement.class";
import AbstractGrafcetCommand from "./AbstractGrafcetCommand.class";

/**
 * Command to update elements in the grafcet.
 *
 * You can provide the new data and/or position of the elements to update.
 * If the data is provided, the previousData property must also be provided to allow undoing the command.
 * If the position is provided, the previousPosition property must also be provided to allow undoing the command.
 */
export default class ElementsUpdateCommand extends AbstractGrafcetCommand<
	{
		type: GrafcetElementType;
		id: string;
		data?: any;
		previousData?: any;
		position?: XYPosition;
		previousPosition?: XYPosition;
	}[]
> {
	getType(): string {
		return "elements-update";
	}

	execute(grafcet: Grafcet): [grafcet: Grafcet, isCommandValid: boolean] {
		grafcet.updateElements(
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
