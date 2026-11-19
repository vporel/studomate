/** @jest-environment jsdom */
import {
	flushUrlQueryParams,
	getCurrentUrl,
	getUrlQueryParam,
	setUrlQueryParam,
} from "./url";

describe("url", () => {
	beforeEach(() => {
		flushUrlQueryParams();
		window.history.replaceState(null, "", "/");
	});

	it("getUrlQueryParam retourne null quand le paramètre est absent", () => {
		expect(getUrlQueryParam("foo")).toBeNull();
	});

	it("setUrlQueryParam pose le paramètre, getUrlQueryParam le relit", () => {
		setUrlQueryParam("foo", "bar");
		flushUrlQueryParams();
		expect(getUrlQueryParam("foo")).toBe("bar");
		expect(window.location.search).toBe("?foo=bar");
	});

	it("setUrlQueryParam(null) retire le paramètre", () => {
		setUrlQueryParam("foo", "bar");
		setUrlQueryParam("foo", null);
		flushUrlQueryParams();
		expect(getUrlQueryParam("foo")).toBeNull();
		expect(window.location.search).toBe("");
	});

	it("ne touche pas aux autres paramètres", () => {
		window.history.replaceState(null, "", "/?keep=1");
		setUrlQueryParam("foo", "bar");
		flushUrlQueryParams();
		expect(getUrlQueryParam("keep")).toBe("1");
	});

	it("n'ajoute pas d'entrée d'historique (replaceState)", () => {
		const before = window.history.length;
		setUrlQueryParam("foo", "bar");
		flushUrlQueryParams();
		expect(window.history.length).toBe(before);
	});

	describe("grouped writes", () => {
		afterEach(() => jest.useRealTimers());

		it("writes several changes in a single replaceState, on the next task", () => {
			jest.useFakeTimers();
			window.history.replaceState(null, "", "/?a=1&b=2");
			const replaceState = jest.spyOn(window.history, "replaceState");

			setUrlQueryParam("a", null);
			setUrlQueryParam("c", "3");
			setUrlQueryParam("b", "4");
			expect(replaceState).not.toHaveBeenCalled();

			jest.runAllTimers();

			expect(replaceState).toHaveBeenCalledTimes(1);
			expect(window.location.search).toBe("?b=4&c=3");
			replaceState.mockRestore();
		});

		it("lets a read see a write not yet applied", () => {
			window.history.replaceState(null, "", "/?a=1");

			setUrlQueryParam("a", "2");
			setUrlQueryParam("b", "x");
			setUrlQueryParam("b", null);

			expect(getUrlQueryParam("a")).toBe("2");
			expect(getUrlQueryParam("b")).toBeNull();
			expect(window.location.search).toBe("?a=1");
		});

		it("includes the pending changes in the current URL", () => {
			window.history.replaceState(null, "", "/app?a=1");

			setUrlQueryParam("a", null);
			setUrlQueryParam("b", "2");

			expect(getCurrentUrl().search).toBe("?b=2");
			expect(getCurrentUrl().pathname).toBe("/app");
		});

		it("writes nothing when nothing is pending", () => {
			const replaceState = jest.spyOn(window.history, "replaceState");

			flushUrlQueryParams();

			expect(replaceState).not.toHaveBeenCalled();
			replaceState.mockRestore();
		});
	});
});
