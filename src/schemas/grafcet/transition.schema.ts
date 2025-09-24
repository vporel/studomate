import GrafcetElement, {
	GrafcetElementDimensions,
	GrafcetElementPosition,
} from "./grafcet-element.schema";

export type TransitionData = {
	expression: string;
};

export default class Transition extends GrafcetElement {
	static defaultDimensions: GrafcetElementDimensions = {
		width: 40,
		height: 30,
	};

	static defaultData: TransitionData = {
		expression: "",
	};

	id: string = "";
	data: TransitionData = Transition.defaultData;

	constructor(
		id: string,
		data: TransitionData,
		position: GrafcetElementPosition
	) {
		super(position);
		this.id = id;
		this.data = data;
	}

	/**
	 *
	 * @returns null if there is no error
	 */
	validate(): string[] | null {
		/*
            Expression
        */

		return null;
	}
}
