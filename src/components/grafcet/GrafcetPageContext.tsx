'use client'
import { PAPERS_SIZES } from '@/constants';
import { mmToPx } from '@/lib/utils';
import { createTheme } from '@mui/material';
import { Dimensions, Node, XYPosition } from '@xyflow/react';
import { createContext, useState, useContext, ReactNode, useCallback, Dispatch, SetStateAction } from 'react';

export type GrafcetContextMenuElementType = "pane"|"node"|"edge"
export type GrafcetContextMenuData = {elementType: GrafcetContextMenuElementType, elementId?: string, visible: boolean, position: XYPosition}

type GrafcetPageContextType = {
	flowDimensions: Dimensions,
	contextMenuData: GrafcetContextMenuData,
	setContextMenuData: Dispatch<SetStateAction<GrafcetContextMenuData>>,
};	

const GrafcetPageContext = createContext<GrafcetPageContextType>({
	flowDimensions: {width: 0, height: 0},
	contextMenuData: {elementType: "pane", elementId: "", visible: false, position: {x: 0, y: 0}},
	setContextMenuData: () => {}
});

export const GrafcetPageContextProvider = ({ children }: { children: ReactNode }) => {
	const [flowDimensions, setFlowDimensions] = useState<Dimensions>({width: mmToPx(PAPERS_SIZES.A4_PORTRAIT.width), height: mmToPx(PAPERS_SIZES.A4_PORTRAIT.height)})
	const [contextMenuData, setContextMenuData] = useState<GrafcetContextMenuData>({elementType: "pane", elementId: "", visible: false, position: {x: 0, y: 0}})

	return (
		<GrafcetPageContext.Provider value={{ flowDimensions, contextMenuData, setContextMenuData }}>
			{children}
		</GrafcetPageContext.Provider>
	);
}

export const useGrafcetPageContext = () => useContext(GrafcetPageContext);