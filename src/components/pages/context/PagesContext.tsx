"use client";
import UnsavedChangesDialog from "@/components/dialogs/UnsavedChangesDialog";
import useBooleanState from "@/lib/hooks/useBooleanState";
import {
	createContext,
	Dispatch,
	ReactNode,
	SetStateAction,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useProjectContext } from "../../projects/ProjectContext";
import { PROJECT_PROPERTIES_PAGE_DATA, PROJECT_PROPERTIES_PAGE_ID } from "../ProjectPropertiesPage";
import { PageData } from "./pages-data";
import useClosePage from "./useClosePage";
import useOpenPage from "./useOpenPage";
import usePagesData from "./usePagesData";
import useProjectEventsOutHandlers from "./useProjectEventsOutHandlers";
import useSavePageChanges from "./useSavePageChanges";

type PagesContextType = {
	pagesData: Record<string, PageData>;
	updatePageData: (objectId: string, newData: Partial<PageData>) => void;
	pagesOrder: string[];
	setPagesOrder: Dispatch<SetStateAction<string[]>>;
	activePageId: string;
	setActivePageId: Dispatch<SetStateAction<string>>;
	closePage: (pageId: string) => Promise<boolean>;
	openPage: (pageId: string, pageData: PageData) => void;
	openProjectPropertiesPage: () => void;
};

const PagesContext = createContext<PagesContextType>({
	pagesData: {},
	updatePageData: () => {},
	pagesOrder: [],
	setPagesOrder: () => {},
	activePageId: "",
	setActivePageId: () => {},
	closePage: async () => false,
	openPage: () => {},
	openProjectPropertiesPage: () => {},
});

export const PagesContextProvider = ({
	initialPagesData,
	children,
}: {
	initialPagesData: Record<string, PageData>;
	children: ReactNode;
}) => {
	const { pagesData, updatePageData, setPagesData, pagesOrder, setPagesOrder } =
		usePagesData(initialPagesData);
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
	const { closePage, closePageWithPrompt } = useClosePage(
		pagesData,
		setPagesData,
		setPagesOrder,
		setActivePageId,
		openUnsavedChangesDialog,
		setOnUnsavedChangesDialogCancel,
		setOnUnsavedChangesDialogContinueWithoutSaving,
		setOnUnsavedChangesDialogSaveAndContinue,
		savePageChanges
	);
	const { openPage } = useOpenPage(setPagesData, setPagesOrder, setActivePageId);

	const openProjectPropertiesPage = useCallback(() => {
		openPage(PROJECT_PROPERTIES_PAGE_ID, PROJECT_PROPERTIES_PAGE_DATA);
	}, [openPage]);

	useProjectEventsOutHandlers(setPagesData, projectEventsOut, setActivePageId, openPage, closePage);

	useEffect(() => {
		setActiveScope(activePageId);
	}, [activePageId, setActiveScope]);

	return (
		<PagesContext.Provider
			value={{
				pagesData,
				updatePageData,
				pagesOrder,
				setPagesOrder,
				activePageId,
				setActivePageId,
				closePage: closePageWithPrompt,
				openPage,
				openProjectPropertiesPage,
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
				buttonsProps={{
					continueWithoutSaving: {
						text: "Fermer sans enregistrer",
					},
				}}
			/>
		</PagesContext.Provider>
	);
};

export const usePagesContext = () => useContext(PagesContext);
