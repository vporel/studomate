"use client";
import { CoilType, ContactType } from "@/schemas/ladder/element.schema";
import createDndContext from "@/ui/lib/create-dnd-context";

export type DraggedLadderElement =
	{ kind: "contact"; type: ContactType } | { kind: "coil"; type: CoilType };

const { Provider, useDnD } = createDndContext<DraggedLadderElement>();

export const LadderToolbarDnDProvider = Provider;
export const useLadderToolbarDnD = useDnD;
