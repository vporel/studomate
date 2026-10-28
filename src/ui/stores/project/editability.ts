import { ProjectMode } from "./ProjectMode.enum";
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
 * The project can be modified from the active page: in design mode, on a page that is not
 * locked, and not opened read-only.
 */
export function canEdit(state: EditabilityState): boolean {
	return (
		state.mode === ProjectMode.DESIGN &&
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
	if (canEdit(state)) return false;
	if (isPageEditingEnabled(state, state.activePageId ?? "")) {
		console.warn(`Cannot ${operation} in non-design mode`);
	}
	return true;
}
