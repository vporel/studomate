import GrafcetElement, {
	GrafcetElementDimensions,
	GrafcetElementPosition,
} from "./grafcet-element.schema";

export type StepData = {
	number: number | "";
	isInitial?: boolean;
};

export default class Step extends GrafcetElement {
	static defaultDimensions: GrafcetElementDimensions = {
		width: 40,
		height: 40,
	};

	static defaultData: StepData = {
		number: "",
		isInitial: false,
	};

	id: string = "";
	data: StepData = Step.defaultData;

	constructor(id: string, data: StepData, position: GrafcetElementPosition) {
		super(position);
		this.id = id;
		this.data = data;
	}

	/**
	 *
	 * @returns null if there is no error
	 */
	validate(): string[] | null {
		return null;
	}
}
