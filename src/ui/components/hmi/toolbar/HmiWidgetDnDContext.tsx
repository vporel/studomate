"use client";
import { HmiWidgetTool } from "@/ui/components/hmi/logic/constants";
import createDndContext from "@/ui/lib/create-dnd-context";

const { Provider, useDnD } = createDndContext<HmiWidgetTool>();

export const HmiWidgetDnDProvider = Provider;
export const useHmiWidgetDnD = useDnD;
