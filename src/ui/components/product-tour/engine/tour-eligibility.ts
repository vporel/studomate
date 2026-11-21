import {
	getEditorTourSeen,
	getProductTourSeen,
	type EditorTourKind,
} from "@/persistence/preferences.storage";
import { areToursSuppressed } from "./tour-suppression";

export function shouldStartAppTour(): boolean {
	return !areToursSuppressed() && !getProductTourSeen();
}

/** The app tour comes first: an editor tour only starts once the visitor has been through it. */
export function shouldStartEditorTour(kind: EditorTourKind): boolean {
	return (
		!areToursSuppressed() && getProductTourSeen() && !getEditorTourSeen(kind)
	);
}
