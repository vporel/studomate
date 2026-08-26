export type PdfExportOrientation = "portrait" | "landscape";

export interface PdfExportSection {
	label: string;
	element: HTMLElement;
	orientation: PdfExportOrientation;
}

export interface PdfExporter {
	export(sections: PdfExportSection[], filename: string): Promise<void>;
}
