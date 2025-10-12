"use client";

import { Dispatch, SetStateAction, useCallback } from "react";
import { PageData } from "./pages-data";

export default function useClosePage(
	pagesData: Record<string, PageData>,
	setPagesData: Dispatch<SetStateAction<Record<string, PageData>>>,
	setActivePageId: Dispatch<SetStateAction<string>>,
	openUnsavedChangesDialog: () => void,
	setOnUnsavedChangesDialogCancel: Dispatch<SetStateAction<null | (() => void)>>,
	setOnUnsavedChangesDialogContinueWithoutSaving: Dispatch<SetStateAction<null | (() => void)>>,
	setOnUnsavedChangesDialogSaveAndContinue: Dispatch<SetStateAction<null | (() => void)>>,
	savePageChanges: (pageId: string, pageData: PageData) => void
) {
	const closePage = useCallback(
		(pageId: string) => {
			setPagesData((oldPagesData) => {
				if (!oldPagesData[pageId]) return oldPagesData;
				const newPagesData = structuredClone(oldPagesData);
				delete newPagesData[pageId];
				//If the page was active, activate the previous page if the page is not the first one, otherwise the next one
				setActivePageId((currentActivePageId) => {
					if (currentActivePageId !== pageId || Object.keys(newPagesData).length === 0)
						return currentActivePageId;
					const indexInOld = Object.keys(oldPagesData).indexOf(pageId);
					if (indexInOld === 0) {
						return Object.keys(newPagesData)[0];
					}
					return Object.keys(oldPagesData)[indexInOld - 1];
				});
				return newPagesData;
			});
		},
		[setPagesData, setActivePageId]
	);

	const closePageWithPrompt = useCallback(
		(pageId: string) => {
			return new Promise<boolean>((resolve) => {
				const pageData = pagesData[pageId];
				if (!pageData) resolve(false);
				if (pageData.hasUnsavedChanges) {
					openUnsavedChangesDialog();
					setOnUnsavedChangesDialogCancel(() => () => {
						resolve(false);
					});
					setOnUnsavedChangesDialogContinueWithoutSaving(() => () => {
						closePage(pageId);
						resolve(true);
					});
					setOnUnsavedChangesDialogSaveAndContinue(() => () => {
						savePageChanges(pageId, pageData);
						closePage(pageId);
						resolve(true);
					});
				} else {
					closePage(pageId);
					resolve(true);
				}
			});
		},
		[
			pagesData,
			openUnsavedChangesDialog,
			setOnUnsavedChangesDialogCancel,
			setOnUnsavedChangesDialogContinueWithoutSaving,
			setOnUnsavedChangesDialogSaveAndContinue,
			closePage,
			savePageChanges,
		]
	);

	return { closePage, closePageWithPrompt };
}
