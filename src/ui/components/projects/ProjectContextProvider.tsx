"use client";
import createAppProjectStoreEnvironment from "@/ui/stores/project/environment/app-project-store-environment";
import {
	ProjectStoreProvider,
	useProjectStoreInstance,
} from "./ProjectContext";
import { setLastMousePosition } from "@/ui/lib/mouse-position";
import {
	clearHandoffFromUrl,
	clearTemplateParamsFromUrl,
	getHandoffIdFromUrl,
	getProjectIdFromUrl,
	getShareTokenFromUrl,
	getTemplateAutostartFromUrl,
	getTemplateIdFromUrl,
	getTemplateLocaleFromUrl,
	getTemplateModeFromUrl,
	setProjectIdInUrl,
} from "@/ui/stores/project/url/project-url";
import { resolveUiLocale } from "@/persistence/preferences.storage";
import { PROJECT_TEMPLATES } from "@/templates/index";
import { getTemplateStatement } from "@/templates/template-text";
import { ReactNode, useEffect, useState } from "react";
import AnalysisResult from "./analysis-result/AnalysisResult";
import CrossReferenceResult from "./cross-reference/CrossReferenceResult";
import ExportModal from "./ExportModal";
import NewProjectModal from "./NewProjectModal";
import ProjectOpenModal from "./ProjectOpenModal";
import SaveAsModal from "./SaveAsModal";
import ShareProjectModal from "./ShareProjectModal";
import ShareRequiresCloudModal from "./ShareRequiresCloudModal";
import DraftRecoveryDialog from "./DraftRecoveryDialog";
import DraftConflictDialog from "./DraftConflictDialog";
import CloudConflictDialog from "./CloudConflictDialog";
import SaveLocationModal from "./SaveLocationModal";
import HardwareFirmwareDialog from "./HardwareFirmwareDialog";
import HardwareObservationDialog from "./HardwareObservationDialog";
import UnsavedChangesDialog from "./ProjectUnsavedChangesDialog";
import useShortcutsHandler from "./useShortcutsHandler";
import { suppressProductTourForThisPageLoad } from "@/ui/components/product-tour/product-tour-eligibility";
import { parseDraftProject } from "@/persistence/draft.storage";
import { getHandoff } from "@/persistence/handoff.storage";
import { EXERCISE_PAGE_DATA } from "@/ui/stores/project/pages-data";

function ShortcutsHandler() {
	useShortcutsHandler();
	return null;
}

export const ProjectContextProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const store = useProjectStoreInstance(createAppProjectStoreEnvironment);

	useEffect(() => {
		const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
			if (!store.getState().hasUnsavedChanges) return;
			e.preventDefault();
		};

		window.addEventListener("beforeunload", beforeUnloadHandler);
		return () => {
			window.removeEventListener("beforeunload", beforeUnloadHandler);
		};
	}, [store]);

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			setLastMousePosition(event.clientX, event.clientY);
		};
		window.addEventListener("mousemove", handleMouseMove);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, [store]);

	// Démarre l'auto-save dès le montage, l'arrête au démontage
	useEffect(() => {
		store.getState().lifecycleManager.startAutoSave();
		return () => {
			store.getState().lifecycleManager.stopAutoSave();
		};
	}, [store]);

	// Affichée au démarrage à froid (aucun projet ni token dans l'URL) ; réactivée plus bas si
	// la réouverture d'un projet dont l'id est dans l'URL échoue (id invalide, projet supprimé).
	const [showDraftDialog, setShowDraftDialog] = useState(
		() =>
			!getProjectIdFromUrl() &&
			!getShareTokenFromUrl() &&
			!getTemplateIdFromUrl() &&
			!getHandoffIdFromUrl(),
	);

	// Ouverture par token de partage (prioritaire sur l'id de projet)
	useEffect(() => {
		const shareToken = getShareTokenFromUrl();
		if (!shareToken) return;
		suppressProductTourForThisPageLoad();
		const reopen = async () => {
			const opened = await store
				.getState()
				.lifecycleManager.openProjectByShareToken(shareToken);
			if (!opened) {
				store.getState().finishBoot();
				setShowDraftDialog(true);
			}
		};
		void reopen();
	}, [store]);

	// Rouvre le projet dont l'id voyage dans l'URL, en cherchant d'abord un brouillon
	useEffect(() => {
		if (getShareTokenFromUrl()) return;
		const projectId = getProjectIdFromUrl();
		if (!projectId) return;
		const reopen = async () => {
			const opened = await store
				.getState()
				.lifecycleManager.openProject(projectId, true);
			if (!opened) {
				store.getState().finishBoot();
				setProjectIdInUrl(null);
				setShowDraftDialog(true);
			}
		};
		void reopen();
	}, [store]);

	// Ouverture depuis un lien de template (`?template=id[&template-mode=solution]`, voir la
	// landing page) — priorité au token de partage / à l'id de projet s'ils sont présents.
	useEffect(() => {
		if (getShareTokenFromUrl() || getProjectIdFromUrl()) return;
		const templateId = getTemplateIdFromUrl();
		if (!templateId) return;
		const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
		if (!template) {
			clearTemplateParamsFromUrl();
			store.getState().finishBoot();
			setShowDraftDialog(true);
			return;
		}
		const wantsSolution =
			getTemplateModeFromUrl() === "solution" && !!template.solution;
		const autostartSimulation = getTemplateAutostartFromUrl();
		const locale = getTemplateLocaleFromUrl() ?? resolveUiLocale();
		if (autostartSimulation) suppressProductTourForThisPageLoad();
		const open = async () => {
			await store
				.getState()
				.lifecycleManager.newProjectFromTemplate(
					templateId,
					wantsSolution ? "solution" : "exercise",
					locale,
				);
			clearTemplateParamsFromUrl();
			if (autostartSimulation) {
				// Pas d'énoncé affiché ici : on veut atterrir directement sur la simulation
				// (grafcet, ou HMI si le template en a une — voir `openHmiSimulationPageIfAny`),
				// pas sur la page de démarrage classique.
				store.getState().simulationManager.setSimulationMode();
				return;
			}
			// Un template ouvert depuis un lien porte un énoncé : on l'affiche directement plutôt
			// que la page de démarrage classique, exercice comme solution.
			if (getTemplateStatement(templateId, locale)) {
				store.getState().pagesManager.openPage(EXERCISE_PAGE_DATA);
			}
		};
		void open();
	}, [store]);

	// Ouverture d'un projet transmis par une page du site (`?handoff=token`) : il devient un
	// nouveau projet, non enregistré tant que l'utilisateur ne le décide pas, avec les onglets
	// qui étaient ouverts sur la page d'origine.
	useEffect(() => {
		if (getShareTokenFromUrl() || getProjectIdFromUrl()) return;
		const handoffId = getHandoffIdFromUrl();
		if (!handoffId) return;
		const handoff = getHandoff(handoffId);
		clearHandoffFromUrl();
		if (!handoff) {
			store.getState().finishBoot();
			setShowDraftDialog(true);
			return;
		}
		const { project, templateId, locale, pages } = handoff;
		void store
			.getState()
			.lifecycleManager.newProjectFromHandoff(
				project,
				templateId,
				locale,
				pages,
			);
	}, [store]);

	const handleDraftOpen = (draftData: string) => {
		const project = parseDraftProject(draftData);
		if (!project) return;
		void store.getState().lifecycleManager.openProject(project.id, true);
	};

	return (
		<ProjectStoreProvider store={store}>
			{children}
			<ShortcutsHandler />
			<UnsavedChangesDialog />
			<HardwareFirmwareDialog />
			<HardwareObservationDialog />
			<NewProjectModal />
			<ProjectOpenModal />
			<ExportModal />
			<SaveAsModal />
			<ShareProjectModal />
			<ShareRequiresCloudModal />
			<AnalysisResult />
			<CrossReferenceResult />
			{showDraftDialog && <DraftRecoveryDialog onOpen={handleDraftOpen} />}
			<DraftConflictDialog />
			<CloudConflictDialog />
			<SaveLocationModal />
		</ProjectStoreProvider>
	);
};
