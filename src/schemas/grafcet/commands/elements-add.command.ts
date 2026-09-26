import Grafcet from "../grafcet.schema";
import AbstractElementsCommand from "./abstract-elements.command";

export default class ElementsAddCommand extends AbstractElementsCommand {
	getType(): string {
		return "grafcet-elements-add";
	}

	execute(grafcet: Grafcet): [grafcet: Grafcet, isCommandValid: boolean] {
		this.addPayloadElements(grafcet);
		return [grafcet, true];
	}

	cancel(grafcet: Grafcet): Grafcet {
		this.removePayloadElements(grafcet);
		return grafcet;
	}
}
