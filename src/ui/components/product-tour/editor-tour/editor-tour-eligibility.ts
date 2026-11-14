import {
	getEditorTourSeen,
	getProductTourSeen,
	type EditorTourKind,
} from "@/persistence/preferences.storage";
import { areToursSuppressed } from "@/ui/components/product-tour/engine/tour-suppression";

/** The app tour comes first: an editor tour only starts once the visitor has been through it. */
export default function shouldStartEditorTour(kind: EditorTourKind): boolean {
	return (
		!areToursSuppressed() && getProductTourSeen() && !getEditorTourSeen(kind)
	);
}
