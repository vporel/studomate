import { Node } from "@xyflow/react";

type PageDataBase = {
	title: string;
	active: boolean;
	hasUnsavedChanges: boolean;
};

export type GrafcetPageData = PageDataBase & {
	type: "grafcet";
	width?: number;
	height?: number;
	nodes?: Array<Node>;
};

type PageData = GrafcetPageData;
