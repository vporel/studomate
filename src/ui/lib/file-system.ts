"use client";

/**
 *
 * @param description
 * @param accept
 * @returns a file handle
 */
export async function openFileDialog(
	description: string,
	accept: { [key: string]: string[] },
): Promise<FileSystemFileHandle | null> {
	// @ts-expect-error The showOpenFilePicker API is not yet fully supported in TypeScript's
	if (typeof window === "undefined" || !window.showOpenFilePicker)
		throw new Error("The File System Access API is not supported in this browser.");
	try {
		const options = {
			types: [
				{
					description,
					accept,
				},
			],
		};
		// @ts-expect-error The showOpenFilePicker API is not yet fully supported in TypeScript's
		return (await window.showOpenFilePicker(options))[0];
	} catch {
		//Open cancelled or failed
		return null;
	}
}

export function openFileViaInput(accept: string): Promise<string | null> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = accept;
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return resolve(null);
			try {
				const text = await file.text();
				resolve(text);
			} catch {
				resolve(null);
			}
		};
		input.click();
	});
}

export async function openSaveDialog(
	description: string,
	accept: { [key: string]: string[] },
	suggestedName?: string,
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
	} catch {
		//Save cancelled or failed
		return null;
	}
}

/**
 * Reads the contents of a file
 * @param fileHandle The file handle to read from
 * @returns The contents of the file as a string
 */
export async function readFile(fileHandle: FileSystemFileHandle): Promise<string> {
	if (!fileHandle) throw new Error("No file handle provided");
	try {
		const file = await fileHandle.getFile();
		return await file.text();
	} catch (err) {
		console.error("Failed to read file:", err);
		return "";
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
