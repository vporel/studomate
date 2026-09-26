/**
 * @jest-environment jsdom
 */
import {
	readJson,
	readString,
	writeJson,
	writeString,
} from "./safe-local-storage";

describe("safe-local-storage", () => {
	afterEach(() => {
		jest.restoreAllMocks();
		localStorage.clear();
	});

	describe("readString", () => {
		it("renvoie la valeur stockée", () => {
			localStorage.setItem("k", "v");

			expect(readString("k")).toBe("v");
		});

		it("renvoie null pour une clé absente", () => {
			expect(readString("absent")).toBeNull();
		});

		it("renvoie null quand le stockage lève", () => {
			jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
				throw new Error("blocked");
			});

			expect(readString("k")).toBeNull();
		});
	});

	describe("readJson", () => {
		it("parse le JSON stocké", () => {
			localStorage.setItem("k", JSON.stringify({ a: [1, 2] }));

			expect(readJson("k")).toEqual({ a: [1, 2] });
		});

		it("renvoie undefined pour une clé absente", () => {
			expect(readJson("absent")).toBeUndefined();
		});

		it("renvoie undefined pour un JSON corrompu", () => {
			localStorage.setItem("k", "{oups");

			expect(readJson("k")).toBeUndefined();
		});

		it("renvoie undefined quand le stockage lève", () => {
			jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
				throw new Error("blocked");
			});

			expect(readJson("k")).toBeUndefined();
		});

		it("distingue le JSON null de l'absence de clé", () => {
			localStorage.setItem("k", "null");

			expect(readJson("k")).toBeNull();
		});
	});

	describe("écriture", () => {
		it("writeString écrit et renvoie ok", () => {
			expect(writeString("k", "v")).toEqual({ ok: true });
			expect(localStorage.getItem("k")).toBe("v");
		});

		it("writeJson sérialise la valeur", () => {
			expect(writeJson("k", { a: 1 })).toEqual({ ok: true });
			expect(localStorage.getItem("k")).toBe('{"a":1}');
		});

		it("classe un dépassement de quota", () => {
			jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
				throw new DOMException("full", "QuotaExceededError");
			});

			expect(writeString("k", "v")).toEqual({
				ok: false,
				reason: "quota-exceeded",
			});
		});

		it("classe une autre erreur comme inconnue sans lever", () => {
			jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
				throw new Error("boom");
			});

			expect(writeJson("k", 1)).toEqual({ ok: false, reason: "unknown" });
		});
	});
});
