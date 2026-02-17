import { downloadFromUrl } from "@/lib/utils";
import { GrafcetFormat } from "@/schemas/grafcet/Grafcet.class";
import { getFlowDimensions } from "@/utils/grafcet/grafcet-utils";
import domToImage from "dom-to-image";

export const exportGrafcet = (grafcetId: string, format: GrafcetFormat) => {
	const dimensions = getFlowDimensions(format);
	// we calculate a transform for the nodes so that all nodes are visible
	// we then overwrite the transform of the `.react-flow__viewport` element
	// with the style option of the html-to-image library
	const padding = 10;
	const pixelRatio = 5;
	const scaledPadding = padding * pixelRatio;
	const htmlElement = document.querySelector(
		".grafcet-page#" + grafcetId + " .react-flow__viewport",
	) as HTMLElement;
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
		.then((dataUrl) => downloadFromUrl(dataUrl, "flow.jpeg"));
};
