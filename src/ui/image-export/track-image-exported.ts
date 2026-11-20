import trackEvent from "@/ui/services/analytics";
import type { ImageFormat } from "./program-image-export";

/** Records an exported program image for the audience measure. */
export default function trackImageExported(summary: {
	format: ImageFormat;
	programType: "grafcet" | "ladder";
}): void {
	trackEvent("image-exported", summary);
}
