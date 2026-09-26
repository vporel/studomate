import Grafcet from "../grafcet.schema";
import AbstractElementsCommand from "./abstract-elements.command";

export default class ElementsRemoveCommand extends AbstractElementsCommand {
	getType(): string {
		return "grafcet-elements-remove";
	}

	execute(grafcet: Grafcet): [grafcet: Grafcet, isCommandValid: boolean] {
		this.removePayloadElements(grafcet);
		return [grafcet, true];
	}

	cancel(grafcet: Grafcet): Grafcet {
		this.addPayloadElements(grafcet);
		return grafcet;
	}
}
