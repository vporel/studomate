import Project from "@/schemas/project/project.schema";
import {
	PROJECT_STARTUP_PAGE_DATA,
	PROJECT_STARTUP_PAGE_ID,
} from "@/ui/components/pages/ProjectStartupPage";
import {
	PROJECT_PROPERTIES_PAGE_DATA,
	PROJECT_PROPERTIES_PAGE_ID,
} from "@/ui/components/pages/ProjectPropertiesPage";
import {
	EXERCISE_PAGE_DATA,
	EXERCISE_PAGE_ID,
} from "@/ui/components/pages/ExercisePage";
import {
	getVariablesPageData,
	VariablesPageId,
} from "@/ui/components/pages/VariablesPage";
import { getPagesSession } from "@/ui/lib/pages-session-storage";
import {
	PageData,
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "./project.store.types";

export function getInitialPagesData(): Record<string, PageData> {
	const pagesData: Record<string, PageData> = {};
	pagesData[PROJECT_STARTUP_PAGE_ID] = PROJECT_STARTUP_PAGE_DATA;

	return pagesData;
}

const VARIABLES_PAGE_IDS: VariablesPageId[] = [
	"input-variables",
	"output-variables",
	"memory-variables",
];

/**
 * Reconstruit la `PageData` d'un id de page persisté (session ou URL, voir `restorePagesSession`
 * ci-dessous) — `null` si l'id ne correspond plus à rien (programme supprimé depuis). Les pages
 * "programme" (grafcet/ladder) ne portent que leur id en persistance : titre et type sont
 * retrouvés depuis le projet, jamais dupliqués dans la session.
 */
function resolvePageData(pageId: string, project: Project): PageData | null {
	if (pageId === PROJECT_STARTUP_PAGE_ID) return PROJECT_STARTUP_PAGE_DATA;
	if (pageId === PROJECT_PROPERTIES_PAGE_ID) return PROJECT_PROPERTIES_PAGE_DATA;
	if (pageId === EXERCISE_PAGE_ID) return EXERCISE_PAGE_DATA;
	if ((VARIABLES_PAGE_IDS as string[]).includes(pageId))
		return getVariablesPageData(pageId as VariablesPageId);
	const program = project.getProgram(pageId);
	if (program)
		return { id: program.id, title: program.name, type: program.type };
	const hmiPage = project.getHmiPage(pageId);
	if (hmiPage) return { id: hmiPage.id, title: hmiPage.name, type: "hmi" };
	return null;
}

/**
 * Rouvre les onglets d'une session de navigateur précédente (voir `pages-session-storage.ts`)
 * pour ce projet, et active en priorité `urlActiveId` (lien partagé) sur la page active
 * mémorisée par la session — voir la discussion produit associée. Appelée juste après
 * `_openProject`, qui a déjà posé l'état par défaut (page de démarrage seule) : si rien n'est
 * restaurable (aucune session, id d'URL introuvable), cet état par défaut reste inchangé.
 */
export function restorePagesSession(
	set: ProjectStoreSetFunction,
	get: ProjectStoreGetFunction,
	project: Project,
	urlActiveId: string | null,
) {
	const session = getPagesSession(project.id);
	if (!session && !urlActiveId) return;

	set(() => ({ pagesData: {}, pagesOrder: [], activePageId: null }));
	const pagesManager = get().pagesManager;
	let opened = false;
	for (const id of session?.pagesOrder ?? []) {
		const pageData = resolvePageData(id, project);
		if (!pageData) continue; //programme supprimé depuis l'enregistrement de la session
		pagesManager.openPage(pageData);
		opened = true;
	}

	const desiredActiveId = urlActiveId ?? session?.activePageId ?? null;
	const activePageData = desiredActiveId
		? resolvePageData(desiredActiveId, project)
		: null;
	if (activePageData) {
		//Déjà ouverte -> l'active simplement ; sinon l'ouvre (et l'active, voir PagesManager.openPage)
		pagesManager.openPage(activePageData);
		opened = true;
	}

	if (!opened) {
		//Rien de la session n'a pu être restauré (tout supprimé depuis) : revenir à la page de démarrage
		const initialPagesData = getInitialPagesData();
		set(() => ({
			pagesData: initialPagesData,
			pagesOrder: Object.keys(initialPagesData),
			activePageId: Object.keys(initialPagesData)[0],
		}));
	}
}
