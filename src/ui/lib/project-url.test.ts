/** @jest-environment jsdom */
import {
	getProjectIdFromUrl,
	setProjectIdInUrl,
	getShareTokenFromUrl,
	clearShareTokenFromUrl,
} from "./project-url";

describe("project-url", () => {
	beforeEach(() => {
		window.history.replaceState(null, "", "/");
	});

	it("ne retourne rien quand l'URL ne porte pas de projectId", () => {
		expect(getProjectIdFromUrl()).toBeNull();
	});

	it("setProjectIdInUrl pose le paramètre, getProjectIdFromUrl le relit", () => {
		setProjectIdInUrl("p1");
		expect(getProjectIdFromUrl()).toBe("p1");
		expect(window.location.search).toBe("?projectId=p1");
	});

	it("setProjectIdInUrl(null) retire le paramètre", () => {
		setProjectIdInUrl("p1");
		setProjectIdInUrl(null);
		expect(getProjectIdFromUrl()).toBeNull();
		expect(window.location.search).toBe("");
	});

	it("ne modifie pas le reste de l'URL", () => {
		window.history.replaceState(null, "", "/some/path?other=1");
		setProjectIdInUrl("p1");
		expect(window.location.pathname).toBe("/some/path");
		expect(getProjectIdFromUrl()).toBe("p1");
		expect(new URLSearchParams(window.location.search).get("other")).toBe("1");
	});

	describe("getShareTokenFromUrl", () => {
		it("retourne null si aucun shareToken dans l'URL", () => {
			expect(getShareTokenFromUrl()).toBeNull();
		});

		it("retourne le token présent dans l'URL", () => {
			window.history.replaceState(null, "", "/?shareToken=abc123");
			expect(getShareTokenFromUrl()).toBe("abc123");
		});

		it("coexiste avec d'autres paramètres", () => {
			window.history.replaceState(null, "", "/?projectId=p1&shareToken=tok");
			expect(getShareTokenFromUrl()).toBe("tok");
			expect(getProjectIdFromUrl()).toBe("p1");
		});
	});

	describe("clearShareTokenFromUrl", () => {
		it("retire uniquement le shareToken de l'URL", () => {
			window.history.replaceState(null, "", "/?projectId=p1&shareToken=tok");
			clearShareTokenFromUrl();
			expect(getShareTokenFromUrl()).toBeNull();
			expect(getProjectIdFromUrl()).toBe("p1");
		});

		it("ne lève pas si le shareToken est absent", () => {
			expect(() => clearShareTokenFromUrl()).not.toThrow();
		});
	});
});
