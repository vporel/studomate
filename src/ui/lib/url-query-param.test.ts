/** @jest-environment jsdom */
import { getUrlQueryParam, setUrlQueryParam } from "./url-query-param";

describe("url-query-param", () => {
	beforeEach(() => {
		window.history.replaceState(null, "", "/");
	});

	it("getUrlQueryParam retourne null quand le paramètre est absent", () => {
		expect(getUrlQueryParam("foo")).toBeNull();
	});

	it("setUrlQueryParam pose le paramètre, getUrlQueryParam le relit", () => {
		setUrlQueryParam("foo", "bar");
		expect(getUrlQueryParam("foo")).toBe("bar");
		expect(window.location.search).toBe("?foo=bar");
	});

	it("setUrlQueryParam(null) retire le paramètre", () => {
		setUrlQueryParam("foo", "bar");
		setUrlQueryParam("foo", null);
		expect(getUrlQueryParam("foo")).toBeNull();
		expect(window.location.search).toBe("");
	});

	it("ne touche pas aux autres paramètres", () => {
		window.history.replaceState(null, "", "/?keep=1");
		setUrlQueryParam("foo", "bar");
		expect(getUrlQueryParam("keep")).toBe("1");
	});

	it("n'ajoute pas d'entrée d'historique (replaceState)", () => {
		const before = window.history.length;
		setUrlQueryParam("foo", "bar");
		expect(window.history.length).toBe(before);
	});
});
