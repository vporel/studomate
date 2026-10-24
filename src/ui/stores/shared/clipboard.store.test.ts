import { createClipboardStore } from "./clipboard.store";

describe("clipboard.store", () => {
	it("stocke l'entrée courante", () => {
		const clipboard = createClipboardStore();

		clipboard.getState().setEntry({ scope: "grafcet", data: { a: 1 } });

		expect(clipboard.getState().entry).toEqual({
			scope: "grafcet",
			data: { a: 1 },
		});
	});

	it("une nouvelle copie écrase la précédente, y compris d'un autre scope", () => {
		const clipboard = createClipboardStore();
		clipboard.getState().setEntry({ scope: "grafcet", data: { a: 1 } });

		clipboard.getState().setEntry({ scope: "ladder", data: { b: 2 } });

		expect(clipboard.getState().entry).toEqual({
			scope: "ladder",
			data: { b: 2 },
		});
	});

	it("clear remet l'entrée à null", () => {
		const clipboard = createClipboardStore();
		clipboard.getState().setEntry({ scope: "hmi", data: {} });

		clipboard.getState().clear();

		expect(clipboard.getState().entry).toBeNull();
	});

	it("deux presse-papiers sont indépendants", () => {
		const a = createClipboardStore();
		const b = createClipboardStore();

		a.getState().setEntry({ scope: "grafcet", data: {} });

		expect(b.getState().entry).toBeNull();
	});
});
