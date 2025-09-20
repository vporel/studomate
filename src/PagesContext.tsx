'use client'
import { createTheme } from '@mui/material';
import { Node } from '@xyflow/react';
import { createContext, useState, useContext, ReactNode, useCallback } from 'react';

export type GrafcetPageData = {
	type: "grafcet",
	width: number,
	height: number,
	nodes: Array<Node>
}

type PageData = GrafcetPageData|{}

type PagesContextType = {
	getPageData: (objectId: string) => PageData,
	updatePageData: (objectId: string, newData: PageData) => void
};	

const PagesContext = createContext<PagesContextType>({
	getPageData: () => ({}),
	updatePageData: () => {}
});

export const PagesContextProvider = ({ children }: { children: ReactNode }) => {
	const [pagesData, setPagesData] = useState<Record<string, PageData>>({})

	const getPageData = useCallback((objectId: string) => {
		return pagesData[objectId]
	}, [pagesData])

	const updatePageData = useCallback((objectId: string, newData: PageData) => {
		setPagesData(oldPagesData => {
			const newPagesData = {...oldPagesData}	
			newPagesData[objectId] = {...newPagesData[objectId], ...newData}
			return newPagesData
		})
	}, [])

	return (
		<PagesContext.Provider value={{ getPageData, updatePageData }}>
			{children}
		</PagesContext.Provider>
	);
}

export const usePagesContext = () => useContext(PagesContext);