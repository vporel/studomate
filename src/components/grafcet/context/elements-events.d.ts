import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { XYPosition } from "@xyflow/react";

export type GrafcetElementsEventsAddData = {
	id: string;
	type: GrafcetElementType;
	data: any;
	position: XYPosition;
};
export type GrafcetElementsEventsUpdateData = {
	id: string;
	type: GrafcetElementType;
	data?: any;
	position?: XYPosition;
};
export type GrafcetElementsEventsRemoveData = {
	id: string;
	type: GrafcetElementType;
	data: any;
	position: XYPosition;
};

export type GrafcetElementsEvents = {
	add: GrafcetElementsEventsAddData[];
	update: {
		elements: GrafcetElementsEventsUpdateData[];
		connections?: GrafcetConnection[];
	};
	remove: {
		elements: GrafcetElementsEventsRemoveData[];
		connections?: GrafcetConnection[];
	};
};
