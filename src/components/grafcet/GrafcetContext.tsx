'use client'
import { PAPERS_SIZES } from '@/constants';
import { mmToPx } from '@/lib/utils';
import { Dimensions } from '@xyflow/react';
import { createContext, useState, useContext, ReactNode, useMemo } from 'react';
import mitt, { Emitter } from 'mitt';
import { GrafcetContextMenuProps } from './context-menu/grafcet-context-menu-types';

export type GrafcetContextMenuPaneAction = {type: "select-all"}|{type: "select-all-edges"}|{type: "export"}
export type GrafcetContextMenuNodeAction = {nodeId: string} & ({type: "junction-select-pivot"}|{type: "junction-select-branch", branchIndex: number})
export type GrafcetContextMenuEdgeAction = {}

export type GrafcetContextMenuEvents = {
	show: GrafcetContextMenuProps,
	hide: void,
	"pane-action": GrafcetContextMenuPaneAction,
	"node-action": GrafcetContextMenuNodeAction,
	"edge-action": GrafcetContextMenuEdgeAction
}

type GrafcetContextType = {
	grafcetId: string,
	flowDimensions: Dimensions,
	contextMenuEvents: Emitter<GrafcetContextMenuEvents>
};	

const GrafcetContext = createContext<GrafcetContextType>({
	grafcetId: "",
	flowDimensions: {width: 0, height: 0},
	contextMenuEvents: mitt<GrafcetContextMenuEvents>()
});

export const GrafcetContextProvider = ({ grafcetId, children }: { grafcetId: string, children: ReactNode }) => {
	const [flowDimensions, setFlowDimensions] = useState<Dimensions>({width: mmToPx(PAPERS_SIZES.A4_PORTRAIT.width), height: mmToPx(PAPERS_SIZES.A4_PORTRAIT.height)})
	const contextMenuEvents = useMemo(() => mitt<GrafcetContextMenuEvents>(), [])

	return (
		<GrafcetContext.Provider value={{ grafcetId, flowDimensions, contextMenuEvents }}>
			{children}
		</GrafcetContext.Provider>
	);
}

export const useGrafcetContext = () => useContext(GrafcetContext);