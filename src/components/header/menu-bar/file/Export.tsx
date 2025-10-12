import { GrafcetPageData, usePagesContext } from "@/components/pages/context/PagesContext";
import { downloadFromUrl } from "@/lib/utils";
import { getNodesBounds } from "@xyflow/react";
import domToImage from "dom-to-image";

export function DownloadButton({ objectId }: { objectId: string }) {
	const { getPageData } = usePagesContext();
	const onClick = () => {
		const pageData = getPageData(objectId) as GrafcetPageData;
		// we calculate a transform for the nodes so that all nodes are visible
		// we then overwrite the transform of the `.react-flow__viewport` element
		// with the style option of the html-to-image library
		const nodesBounds = getNodesBounds(pageData.nodes);
		const padding = 10;
		const pixelRatio = 5;
		const scaledPadding = padding * pixelRatio;
		const htmlElement = document.querySelector(
			".grafcet-page#" + objectId + " .react-flow__viewport"
		) as HTMLElement;
		domToImage
			.toJpeg(htmlElement, {
				width: pageData.width * pixelRatio,
				height: pageData.height * pixelRatio,

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

	return <button onClick={onClick}>Télécharger</button>;
}
