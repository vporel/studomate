import { PdfExporter, PdfExportSection } from "./pdf-exporter";

export class Html2PdfExporter implements PdfExporter {
	async export(sections: PdfExportSection[], filename: string): Promise<void> {
		const html2pdf = (await import("html2pdf.js")).default;

		// Construit un conteneur HTML structuré : une div par section, chacune dimensionnée A4
		const wrapper = document.createElement("div");
		wrapper.style.cssText =
			"position:absolute;left:-9999px;top:0;background:white;";

		for (let i = 0; i < sections.length; i++) {
			const section = sections[i];
			const isLandscape = section.orientation === "landscape";
			const pageDiv = document.createElement("div");
			pageDiv.style.cssText = [
				"width:210mm",
				"min-height:297mm",
				"overflow:hidden",
				"background:white",
				i < sections.length - 1 ? "page-break-after:always" : "",
			].join(";");

			const clone = section.element.cloneNode(true) as HTMLElement;
			if (isLandscape) {
				clone.style.transform = "rotate(90deg)";
				clone.style.transformOrigin = "top left";
				clone.style.width = "297mm";
				clone.style.height = "210mm";
				clone.style.marginLeft = "0";
				clone.style.marginTop = "210mm";
			} else {
				clone.style.width = "210mm";
				clone.style.height = "297mm";
			}
			pageDiv.appendChild(clone);
			wrapper.appendChild(pageDiv);
		}

		document.body.appendChild(wrapper);

		try {
			await html2pdf()
				.set({
					margin: 0,
					filename: `${filename}.pdf`,
					image: { type: "jpeg", quality: 0.98 },
					html2canvas: { scale: 3, useCORS: true, backgroundColor: "white" },
					jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
					pagebreak: { mode: ["css"] },
				})
				.from(wrapper)
				.save();
		} finally {
			document.body.removeChild(wrapper);
		}
	}
}
