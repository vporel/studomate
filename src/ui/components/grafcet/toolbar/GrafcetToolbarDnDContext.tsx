"use client";
import { ElementType } from "@/schemas/grafcet/element.schema";
import createDndContext from "@/ui/lib/create-dnd-context";

export type DraggedGrafcetElement =
	| { type: "step"; extraData: { initial?: boolean } }
	| { type: Exclude<ElementType, "step"> };

const { Provider, useDnD } = createDndContext<DraggedGrafcetElement>();

export const GrafcetToolbarDnDProvider = Provider;
export const useGrafcetToolbarDnD = useDnD;
