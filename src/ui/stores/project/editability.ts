import { ProjectMode } from "./project-mode.enum";
import type { PageType, ProjectStoreState } from "./project.store.types";

/** Without the pages, no page is locked. */
type PagesState = Partial<
	Pick<ProjectStoreState, "activePageId" | "pagesData">
>;
type EditabilityState = Pick<ProjectStoreState, "mode" | "editingEnabled"> &
	PagesState;

/** The pages that hold something to edit: the others never show a read-only mark. */
const EDITOR_PAGE_TYPES: readonly PageType[] = [
	"grafcet",
	"ladder",
	"hmi",
	"variables",
];

/** The page is not locked and the project not opened read-only, whatever the mode. */
export function isPageEditingEnabled(
	state: Pick<ProjectStoreState, "editingEnabled"> & PagesState,
	pageId: string,
): boolean {
	return state.editingEnabled && !state.pagesData?.[pageId]?.locked;
}

/**
 * The project can be modified at all: in design mode, and not opened read-only. Whatever the
 * page: use it for what acts on the project itself (explorer, menus, project properties).
 */
export function canEditProject(
	state: Pick<ProjectStoreState, "mode" | "editingEnabled">,
): boolean {
	return state.mode === ProjectMode.DESIGN && state.editingEnabled;
}

/**
 * The project can be modified from the active page: `canEditProject`, on a page that is not
 * locked. Use it for what edits the content shown by the page.
 */
export function canEditActivePage(state: EditabilityState): boolean {
	return (
		canEditProject(state) &&
		isPageEditingEnabled(state, state.activePageId ?? "")
	);
}

/**
 * An editor page that cannot be modified at the moment. An HMI page stays editable during the
 * simulation.
 */
export function isPageReadOnly(
	state: EditabilityState,
	pageId: string,
): boolean {
	const page = state.pagesData?.[pageId];
	if (!page || !EDITOR_PAGE_TYPES.includes(page.type)) return false;
	if (!isPageEditingEnabled(state, pageId)) return true;
	return page.type !== "hmi" && state.mode !== ProjectMode.DESIGN;
}

/**
 * True when `operation` must not be carried out. A refusal caused by the simulation mode is
 * reported as a programming error (the interface should not offer the operation); a read-only
 * project or page is an expected state and refuses silently.
 */
export function refuseEdit(
	state: EditabilityState,
	operation: string,
): boolean {
	if (canEditActivePage(state)) return false;
	if (isPageEditingEnabled(state, state.activePageId ?? "")) {
		console.warn(`Cannot ${operation} in non-design mode`);
	}
	return true;
}
