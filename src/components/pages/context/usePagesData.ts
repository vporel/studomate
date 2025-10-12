"use client";

import { deepObjectsComparison } from "@/lib/object";
import { useCallback, useRef, useState } from "react";
import { GrafcetPageData, PageData } from "./pages-data";

const GRAFCET_PAGE_OBSERVED_PROPERTIES: (keyof GrafcetPageData)[] = ["title", "nodes", "edges"];

export default function usePagesData(initialPagesData: Record<string, PageData>): {
	pagesData: Record<string, PageData>;
	setPagesData: React.Dispatch<React.SetStateAction<Record<string, PageData>>>;
	updatePageData: (objectId: string, newData: Partial<PageData>) => void;
} {
	const [pagesData, setPagesData] = useState<Record<string, PageData>>(initialPagesData);
	const previousPagesDataRef = useRef<Record<string, PageData>>({});

	const updatePageData = useCallback((objectId: string, newData: Partial<PageData>) => {
		setPagesData((oldPagesData) => {
			const newPagesData: any = structuredClone(oldPagesData);
			newPagesData[objectId] = { ...newPagesData[objectId], ...newData };
			// Check if any of the observed properties have changed
			const previousData = previousPagesDataRef.current[objectId];
			if (previousData) {
				let observedProperties: any[] = [];
				switch (newPagesData[objectId].type) {
					case "grafcet":
						observedProperties = GRAFCET_PAGE_OBSERVED_PROPERTIES;
						break;
					case "project-startup":
						observedProperties = ["title"];
						break;
					default:
						observedProperties = [];
				}
				for (const prop of observedProperties) {
					if (
						!deepObjectsComparison(
							(previousData as any)[prop],
							(newPagesData[objectId] as any)[prop]
						)
					) {
						// If any observed property has changed, update the ref
						newPagesData[objectId].hasUnsavedChanges = true;
						break;
					}
				}
			} else {
				newPagesData[objectId].hasUnsavedChanges = true;
			}
			previousPagesDataRef.current[objectId] = structuredClone(newPagesData[objectId]);
			return newPagesData;
		});
	}, []);

	return { pagesData, setPagesData, updatePageData };
}
