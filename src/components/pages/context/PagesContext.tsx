"use client";
import UnsavedChangesDialog from "@/components/misc/UnsavedChangesDialog";
import useBooleanState from "@/lib/hooks/useBooleanState";
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from "react";
import { useProjectContext } from "../../projects/ProjectContext";
import { PageData } from "./pages-data";
import useClosePage from "./useClosePage";
import usePagesData from "./usePagesData";
import useProjectEventsOutHandlers from "./useProjectEventsOutHandlers";
import useSavePageChanges from "./useSavePageChanges";

type PagesContextType = {
	pagesData: Record<string, PageData>;
	updatePageData: (objectId: string, newData: Partial<PageData>) => void;
	activePageId: string;
	setActivePageId: Dispatch<SetStateAction<string>>;
	closePage: (pageId: string) => Promise<boolean>;
};

const PagesContext = createContext<PagesContextType>({
	pagesData: {},
	updatePageData: () => {},
	activePageId: "",
	setActivePageId: () => {},
	closePage: async () => false,
});

export const PagesContextProvider = ({
	initialPagesData,
	children,
}: {
	initialPagesData: Record<string, PageData>;
	children: ReactNode;
}) => {
	if (Object.keys(initialPagesData).length === 0) {
		throw new Error("PagesContextProvider requires at least one page in initialPagesData");
	}
	const { pagesData, updatePageData, setPagesData } = usePagesData(initialPagesData);
	const [activePageId, setActivePageId] = useState<string>(Object.keys(initialPagesData)[0]);
	const { projectEventsOut, setActiveScope } = useProjectContext();
	const savePageChanges = useSavePageChanges();
	const [unsavedChangesDialogOpen, openUnsavedChangesDialog, closeUnsavedChangesDialog] =
		useBooleanState(false);
	const [onUnsavedChangesDialogCancel, setOnUnsavedChangesDialogCancel] = useState<null | (() => void)>(
		null
	);
	const [onUnsavedChangesDialogContinueWithoutSaving, setOnUnsavedChangesDialogContinueWithoutSaving] =
		useState<null | (() => void)>(null);
	const [onUnsavedChangesDialogSaveAndContinue, setOnUnsavedChangesDialogSaveAndContinue] = useState<
		null | (() => void)
	>(null);
	const { closePageWithPrompt } = useClosePage(
		pagesData,
		setPagesData,
		setActivePageId,
		openUnsavedChangesDialog,
		setOnUnsavedChangesDialogCancel,
		setOnUnsavedChangesDialogContinueWithoutSaving,
		setOnUnsavedChangesDialogSaveAndContinue,
		savePageChanges
	);

	useProjectEventsOutHandlers(setPagesData, projectEventsOut, setActivePageId);

	useEffect(() => {
		setActiveScope(activePageId);
	}, [activePageId, setActiveScope]);

	return (
		<PagesContext.Provider
			value={{
				pagesData,
				updatePageData,
				activePageId,
				setActivePageId,
				closePage: closePageWithPrompt,
			}}
		>
			{children}
			<UnsavedChangesDialog
				open={unsavedChangesDialogOpen}
				message="Voulez-vous enregistrer les modifications avant de fermer la page ?"
				onCancel={async () => {
					closeUnsavedChangesDialog();
					if (onUnsavedChangesDialogCancel) onUnsavedChangesDialogCancel();
				}}
				onContinueWithoutSaving={async () => {
					closeUnsavedChangesDialog();
					if (onUnsavedChangesDialogContinueWithoutSaving)
						onUnsavedChangesDialogContinueWithoutSaving();
				}}
				onSave={async () => {
					closeUnsavedChangesDialog();
					if (onUnsavedChangesDialogSaveAndContinue) onUnsavedChangesDialogSaveAndContinue();
				}}
			/>
		</PagesContext.Provider>
	);
};

export const usePagesContext = () => useContext(PagesContext);
