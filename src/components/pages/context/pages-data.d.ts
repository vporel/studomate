import { GrafcetEdge, GrafcetNode } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import Grafcet from "@/schemas/grafcet/Grafcet.class";

export type PageType = "project-startup" | "grafcet";

type PageDataCommon = {
	title: string;
	hasUnsavedChanges?: boolean;
};

export type ProjectStartPageData = PageDataCommon & {
	type: "project-startup";
};

export type GrafcetPageData = PageDataCommon & {
	type: "grafcet";
	grafcet: Grafcet;
	nodes?: GrafcetNode[];
	edges?: GrafcetEdge[];
};

type PageData = ProjectStartPageData | GrafcetPageData;
