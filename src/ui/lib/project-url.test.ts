/** @jest-environment jsdom */
import { getProjectIdFromUrl, setProjectIdInUrl } from "./project-url";

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
});
