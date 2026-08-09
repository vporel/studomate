/**
 * @jest-environment jsdom
 */
import { openFileDialog, openFileViaInput, openSaveDialog, readFile, writeFile } from "./file-system";

describe("openFileDialog", () => {
	afterEach(() => {
		delete (window as any).showOpenFilePicker;
	});

	it("lève quand l'API File System Access n'est pas supportée", async () => {
		await expect(openFileDialog("JSON", { "application/json": [".json"] })).rejects.toThrow();
	});

	it("renvoie le premier handle sélectionné", async () => {
		const handle = { name: "projet.json" } as any;
		(window as any).showOpenFilePicker = jest.fn().mockResolvedValue([handle]);

		const result = await openFileDialog("JSON", { "application/json": [".json"] });

		expect(result).toBe(handle);
	});

	it("renvoie null quand la sélection est annulée (rejet de la promesse native)", async () => {
		(window as any).showOpenFilePicker = jest.fn().mockRejectedValue(new Error("cancelled"));

		const result = await openFileDialog("JSON", { "application/json": [".json"] });

		expect(result).toBeNull();
	});
});

describe("openSaveDialog", () => {
	afterEach(() => {
		delete (window as any).showSaveFilePicker;
	});

	it("lève quand l'API File System Access n'est pas supportée", async () => {
		await expect(openSaveDialog("JSON", { "application/json": [".json"] })).rejects.toThrow();
	});

	it("renvoie le handle choisi pour l'enregistrement", async () => {
		const handle = { name: "projet.json" } as any;
		(window as any).showSaveFilePicker = jest.fn().mockResolvedValue(handle);

		const result = await openSaveDialog("JSON", { "application/json": [".json"] }, "projet.json");

		expect(result).toBe(handle);
		expect((window as any).showSaveFilePicker).toHaveBeenCalledWith(
			expect.objectContaining({ suggestedName: "projet.json" }),
		);
	});

	it("renvoie null quand l'enregistrement est annulé", async () => {
		(window as any).showSaveFilePicker = jest.fn().mockRejectedValue(new Error("cancelled"));

		const result = await openSaveDialog("JSON", { "application/json": [".json"] });

		expect(result).toBeNull();
	});
});

describe("readFile", () => {
	it("lève sans handle", async () => {
		await expect(readFile(null as any)).rejects.toThrow();
	});

	it("renvoie le contenu texte du fichier", async () => {
		const fileHandle = { getFile: async () => ({ text: async () => "contenu" }) } as any;

		const content = await readFile(fileHandle);

		expect(content).toBe("contenu");
	});

	it("renvoie une chaîne vide si la lecture échoue", async () => {
		const fileHandle = {
			getFile: async () => {
				throw new Error("boom");
			},
		} as any;

		const content = await readFile(fileHandle);

		expect(content).toBe("");
	});
});

describe("writeFile", () => {
	it("lève sans handle", async () => {
		await expect(writeFile({ a: 1 }, null as any)).rejects.toThrow();
	});

	it("écrit l'objet sérialisé en JSON puis referme le flux", async () => {
		const write = jest.fn();
		const close = jest.fn();
		const fileHandle = { createWritable: async () => ({ write, close }) } as any;

		await writeFile({ a: 1 }, fileHandle);

		expect(write).toHaveBeenCalledWith(JSON.stringify({ a: 1 }, null, 2));
		expect(close).toHaveBeenCalled();
	});

	it("n'échoue pas (ne relève rien) si l'écriture échoue", async () => {
		const fileHandle = {
			createWritable: async () => {
				throw new Error("boom");
			},
		} as any;

		await expect(writeFile({ a: 1 }, fileHandle)).resolves.toBeUndefined();
	});
});

/** `openFileViaInput` crée son `<input type=file>` sans le monter dans le DOM — on l'intercepte
 * via `document.createElement`, seul point d'accès disponible depuis l'extérieur. */
function interceptCreatedInput(): { getInput: () => HTMLInputElement } {
	const realCreateElement = document.createElement.bind(document);
	let created: HTMLInputElement | null = null;
	jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
		const el = realCreateElement(tag);
		if (tag === "input") created = el as HTMLInputElement;
		return el;
	});
	return { getInput: () => created! };
}

describe("openFileViaInput", () => {
	afterEach(() => jest.restoreAllMocks());

	it("résout avec le contenu texte du fichier sélectionné", async () => {
		const { getInput } = interceptCreatedInput();
		const promise = openFileViaInput(".json");
		const input = getInput();
		// jsdom n'implémente pas `File.prototype.text` : un objet minimal suffit, seule cette
		// méthode est utilisée par `openFileViaInput`.
		const file = { text: async () => "contenu du fichier" };
		Object.defineProperty(input, "files", { value: [file] });

		input.dispatchEvent(new Event("change"));

		await expect(promise).resolves.toBe("contenu du fichier");
	});

	it("résout avec null si aucun fichier n'est choisi", async () => {
		const { getInput } = interceptCreatedInput();
		const promise = openFileViaInput(".json");
		const input = getInput();
		Object.defineProperty(input, "files", { value: [] });

		input.dispatchEvent(new Event("change"));

		await expect(promise).resolves.toBeNull();
	});

	it("porte le filtre 'accept' fourni", () => {
		const { getInput } = interceptCreatedInput();
		jest.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});

		void openFileViaInput(".json,.txt");

		expect(getInput().accept).toBe(".json,.txt");
	});
});
