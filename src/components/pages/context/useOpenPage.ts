"use client";

import { useCallback } from "react";
import { PageData } from "./pages-data";

export default function useOpenPage(
	setPagesData: React.Dispatch<React.SetStateAction<Record<string, PageData>>>,
	setPagesOrder: React.Dispatch<React.SetStateAction<string[]>>,
	setActivePageId: React.Dispatch<React.SetStateAction<string>>
): {
	openPage: (pageId: string, pageData: PageData) => void;
} {
	const openPage = useCallback(
		(pageId: string, pageData: PageData) => {
			setPagesOrder((oldPagesOrder) => {
				if (oldPagesOrder.includes(pageId)) {
					setActivePageId(pageId);
					return oldPagesOrder;
				}
				const newOrder = [...oldPagesOrder];
				newOrder.push(pageId);
				setPagesData((oldPagesData) => {
					if (oldPagesData[pageId]) return oldPagesData;
					const newPagesData = structuredClone(oldPagesData);
					newPagesData[pageId] = pageData;
					return newPagesData;
				});
				setActivePageId(pageId);
				return newOrder;
			});
		},
		[setPagesOrder, setPagesData, setActivePageId]
	);

	return { openPage };
}
