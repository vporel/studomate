import { PdfExporter, PdfExportSection } from "./pdf-exporter";

/** Largeur et hauteur d'une page A4 en mm. */
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
/** Résolution de capture en px/mm — plus élevé = meilleure qualité mais plus lent. */
const PX_PER_MM = 4;

export class JsPdfExporter implements PdfExporter {
	async export(sections: PdfExportSection[], filename: string): Promise<void> {
		const [{ default: jsPDF }, domToImage] = await Promise.all([
			import("jspdf"),
			import("dom-to-image").then((m) => m.default),
		]);

		const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
		let firstPage = true;

		for (const section of sections) {
			const isLandscape = section.orientation === "landscape";

			// En mode paysage pour le Ladder : on capture en portrait puis on pivote dans le PDF
			const pageW = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
			const pageH = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

			const captureW = Math.round(pageW * PX_PER_MM);
			const captureH = Math.round(pageH * PX_PER_MM);

			const dataUrl = await domToImage.toPng(section.element, {
				width: captureW,
				height: captureH,
				bgcolor: "white",
				style: {
					transform: `scale(${PX_PER_MM})`,
					transformOrigin: "top left",
					width: pageW + "mm",
					height: pageH + "mm",
				},
			});

			if (!firstPage) doc.addPage("a4", "portrait");
			firstPage = false;

			if (isLandscape) {
				// Image pivotée à 90° : on la place en mode portrait mais tournée
				doc.addImage(dataUrl, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, "FAST", 90);
			} else {
				doc.addImage(dataUrl, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
			}
		}

		doc.save(`${filename}.pdf`);
	}
}
