import { isShareable } from "@/persistence/repositories/project.repository";
import type { ProjectStoreState } from "./project.store.types";

/**
 * The project can be offered for sharing: its storage supports share links and it was not
 * itself opened from a share link.
 */
export default function canShare(
	state: Pick<ProjectStoreState, "projectRepository" | "isSharedProject">,
): boolean {
	return !state.isSharedProject && isShareable(state.projectRepository);
}
