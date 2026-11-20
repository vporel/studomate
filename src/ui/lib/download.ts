/** Downloads `data` as a file named `filename`. */
export function downloadFile(
	data: BlobPart,
	filename: string,
	mimeType: string,
): void {
	const url = URL.createObjectURL(new Blob([data], { type: mimeType }));
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	// The download may not have started when click() returns (e.g. a "Save as" dialog): an
	// immediate revoke could cancel it.
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
