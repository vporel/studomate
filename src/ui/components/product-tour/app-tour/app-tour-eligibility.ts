import { getProductTourSeen } from "@/persistence/preferences.storage";
import { areToursSuppressed } from "@/ui/components/product-tour/engine/tour-suppression";

export default function shouldStartAppTour(): boolean {
	return !areToursSuppressed() && !getProductTourSeen();
}
