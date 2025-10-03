"use client";

export async function openSaveDialog(
	description: string,
	accept: { [key: string]: string[] },
	suggestedName?: string
): Promise<FileSystemFileHandle | null> {
	// @ts-expect-error The showSaveFilePicker API is not yet fully supported in TypeScript's
	if (typeof window === "undefined" || !window.showSaveFilePicker)
		throw new Error("The File System Access API is not supported in this browser.");
	try {
		const options = {
			suggestedName: suggestedName || "",
			types: [
				{
					description,
					accept,
				},
			],
		};
		// @ts-expect-error The showSaveFilePicker API is not yet fully supported in TypeScript's
		return await window.showSaveFilePicker(options);
	} catch (err) {
		//Save cancelled or failed
		return null;
	}
}
/**
 * Saves an object to a file
 * @param object
 * @param fileHandle
 */
export async function writeFile(object: object, fileHandle: FileSystemFileHandle) {
	if (!fileHandle) throw new Error("No file handle provided");
	try {
		const writable = await fileHandle.createWritable();
		await writable.write(JSON.stringify(object, null, 2));
		await writable.close();
	} catch (err) {
		console.error("Save cancelled or failed:", err);
	}
}
