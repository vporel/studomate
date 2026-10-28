import { isExpectedPage, isOfflineNavigation } from "./navigation";

const MANUAL = new Set([
	"/manuel-utilisateur",
	"/manuel-utilisateur/grafcet",
	"/en/user-manual",
	"/en/user-manual/grafcet",
]);

describe("isOfflineNavigation", () => {
	it.each([
		"/app",
		"/app/3d-scene",
		"/manuel-utilisateur",
		"/manuel-utilisateur/grafcet",
		"/en/user-manual",
		"/en/user-manual/grafcet",
	])("answers %s", (pathname) => {
		expect(isOfflineNavigation(pathname, MANUAL)).toBe(true);
	});

	it.each([
		"/apple-touch-icon.png",
		"/app-x",
		"/",
		"/a-propos",
		"/formations/a1",
		"/mentions-legales",
		"/en/about",
		"/manuel-utilisateur/inconnue",
	])("leaves %s to the network", (pathname) => {
		expect(isOfflineNavigation(pathname, MANUAL)).toBe(false);
	});
});

describe("isExpectedPage", () => {
	const origin = "https://studomate.com";
	const page = (overrides: Partial<Response> = {}) =>
		({
			ok: true,
			redirected: false,
			url: `${origin}/app`,
			headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
			...overrides,
		}) as Response;
	const nextHtml = '<script src="/_next/static/chunks/main.js"></script>';

	it("accepts a Next.js page of the same origin", () => {
		expect(isExpectedPage(page(), nextHtml, origin)).toBe(true);
	});

	it("refuses a captive portal answering 200 with its own HTML", () => {
		expect(isExpectedPage(page(), "<html>Please log in</html>", origin)).toBe(
			false,
		);
	});

	it("refuses a redirected answer, a foreign origin, an error and a non-HTML body", () => {
		expect(isExpectedPage(page({ redirected: true }), nextHtml, origin)).toBe(
			false,
		);
		expect(
			isExpectedPage(page({ url: "http://portal.example/login" }), nextHtml, origin),
		).toBe(false);
		expect(isExpectedPage(page({ ok: false }), nextHtml, origin)).toBe(false);
		expect(
			isExpectedPage(
				page({ headers: new Headers({ "content-type": "application/json" }) }),
				nextHtml,
				origin,
			),
		).toBe(false);
	});
});
