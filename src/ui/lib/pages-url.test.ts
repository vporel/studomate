/** @jest-environment jsdom */
import { getActivePageIdFromUrl, setActivePageIdInUrl } from "./pages-url";

describe("pages-url", () => {
	beforeEach(() => {
		window.history.replaceState(null, "", "/");
	});

	it("ne retourne rien quand l'URL ne porte pas d'activePage", () => {
		expect(getActivePageIdFromUrl()).toBeNull();
	});

	it("setActivePageIdInUrl pose le paramètre, getActivePageIdFromUrl le relit", () => {
		setActivePageIdInUrl("p1");
		expect(getActivePageIdFromUrl()).toBe("p1");
		expect(window.location.search).toBe("?activePage=p1");
	});

	it("setActivePageIdInUrl(null) retire le paramètre", () => {
		setActivePageIdInUrl("p1");
		setActivePageIdInUrl(null);
		expect(getActivePageIdFromUrl()).toBeNull();
		expect(window.location.search).toBe("");
	});

	it("ne modifie pas le reste de l'URL, dont projectId", () => {
		window.history.replaceState(null, "", "/?projectId=proj1");
		setActivePageIdInUrl("p1");
		expect(new URLSearchParams(window.location.search).get("projectId")).toBe(
			"proj1",
		);
		expect(getActivePageIdFromUrl()).toBe("p1");
	});
});
