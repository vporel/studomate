import GrafcetElement, {
	GrafcetElementDimensions,
	GrafcetElementPosition,
} from "./grafcet-element.schema";

export type ActionData = {
	expression: string;
	width: number;
	height: number;
};

export default class Action extends GrafcetElement {
	static defaultDimensions: GrafcetElementDimensions = {
		width: 100,
		height: 40,
	};

	static defaultData: ActionData = {
		expression: "",
		width: Action.defaultDimensions.width,
		height: Action.defaultDimensions.height,
	};
	data: ActionData = Action.defaultData;

	constructor(
		id: string,
		data: ActionData,
		position: GrafcetElementPosition
	) {
		super(id, position);
		this.data = data;
	}

	/**
	 *
	 * @returns null if there is no error
	 */
	validate(): string[] | null {
		/* Expression */

		return null;
	}
}
