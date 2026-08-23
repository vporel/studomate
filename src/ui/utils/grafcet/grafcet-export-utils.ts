import { GrafcetFormat } from "@/schemas/grafcet/grafcet.schema";
import { downloadFromUrl } from "@/ui/lib/utils";
import { getFlowDimensions } from "@/ui/utils/grafcet/grafcet-utils";
import { toast } from "react-toastify";

/**
 * Export a grafcet as an image (jpeg)
 * @param grafcetId
 * @param fileName
 * @param format
 */
export const exportGrafcet = async (grafcetId: string, fileName: string, format: GrafcetFormat) => {
	const domToImage = (await import("dom-to-image")).default;
	const dimensions = getFlowDimensions(format);
	// we calculate a transform for the nodes so that all nodes are visible
	// we then overwrite the transform of the `.react-flow__viewport` element
	// with the style option of the html-to-image library
	const padding = 10;
	const pixelRatio = 5;
	const scaledPadding = padding * pixelRatio;
	const grafcetElement = document.getElementById(grafcetId);
	const htmlElement = grafcetElement?.querySelector(".react-flow__viewport") as HTMLElement;
	domToImage
		.toJpeg(htmlElement, {
			width: dimensions.width * pixelRatio,
			height: dimensions.height * pixelRatio,

			bgcolor: "white",
			style: {
				transform: `translateX(${scaledPadding}px) translateY(${scaledPadding}px) scale(${pixelRatio})`,
			},
			quality: 1,
			// filter: node => {
			// 	return (typeof (node as any).className !== "string") || !(node as HTMLElement).className.split(" ").includes("react-flow__handle")
			// }
		})
		.then((dataUrl) => downloadFromUrl(dataUrl, `${fileName}.jpeg`))
		.catch((e: unknown) => {
			console.error("Failed to export grafcet as image:", e);
			toast.error("L'export du grafcet en image a échoué.");
		});
};
