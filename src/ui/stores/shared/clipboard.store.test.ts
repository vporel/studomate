import clipboardStore, {
	canPasteInScope,
	clearClipboard,
	getClipboardEntry,
	setClipboardEntry,
} from "./clipboard.store";

describe("clipboard.store", () => {
	beforeEach(() => clearClipboard());

	it("stocke l'entrée courante", () => {
		setClipboardEntry({ scope: "grafcet", data: { a: 1 } });

		expect(getClipboardEntry()).toEqual({
			scope: "grafcet",
			data: { a: 1 },
		});
	});

	it("une nouvelle copie écrase la précédente, y compris d'un autre scope", () => {
		setClipboardEntry({ scope: "grafcet", data: { a: 1 } });
		setClipboardEntry({ scope: "ladder", data: { b: 2 } });

		expect(getClipboardEntry()).toEqual({ scope: "ladder", data: { b: 2 } });
	});

	it("clear remet l'entrée à null", () => {
		setClipboardEntry({ scope: "hmi", data: {} });

		clearClipboard();

		expect(getClipboardEntry()).toBeNull();
		expect(clipboardStore.getState().entry).toBeNull();
	});

	describe("canPasteInScope", () => {
		it("false quand le presse-papiers est vide", () => {
			expect(canPasteInScope("grafcet")).toBe(false);
		});

		it("false quand le scope diffère", () => {
			setClipboardEntry({ scope: "grafcet", data: {} });

			expect(canPasteInScope("ladder")).toBe(false);
		});

		it("true quand le scope correspond", () => {
			setClipboardEntry({ scope: "grafcet", data: {} });

			expect(canPasteInScope("grafcet")).toBe(true);
		});
	});
});
