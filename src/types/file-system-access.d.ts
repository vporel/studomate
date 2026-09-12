/**
 * File System Access API (`showOpenFilePicker` / `showSaveFilePicker`) — pas encore dans
 * `lib.dom` de TypeScript. `FileSystemFileHandle` et sa méthode `createWritable`, eux, y sont.
 */
type FileSystemAccessFilePickerOptions = {
	types?: { description?: string; accept: Record<string, string[]> }[];
	excludeAcceptAllOption?: boolean;
};

interface Window {
	showOpenFilePicker?: (
		options?: FileSystemAccessFilePickerOptions & { multiple?: boolean },
	) => Promise<FileSystemFileHandle[]>;
	showSaveFilePicker?: (
		options?: FileSystemAccessFilePickerOptions & { suggestedName?: string },
	) => Promise<FileSystemFileHandle>;
}
