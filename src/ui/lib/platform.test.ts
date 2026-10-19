/** @jest-environment jsdom */
import { isSafari, isStandaloneDisplay } from "./platform";

const SAFARI_MAC =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const CHROME_MAC =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const EDGE_MAC = `${CHROME_MAC} Edg/126.0.0.0`;
const OPERA_MAC = `${CHROME_MAC} OPR/111.0.0.0`;
const FIREFOX_MAC =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0";
const CHROME_ANDROID =
	"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const IOS_HOME_SCREEN_APP =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

function setUserAgent(userAgent: string) {
	Object.defineProperty(navigator, "userAgent", {
		value: userAgent,
		configurable: true,
	});
}

function setNavigatorStandalone(value: boolean | undefined) {
	Object.defineProperty(navigator, "standalone", {
		value,
		configurable: true,
	});
}

function setDisplayModeStandalone(matches: boolean) {
	window.matchMedia = jest.fn().mockImplementation((query: string) => ({
		matches: matches && query === "(display-mode: standalone)",
	})) as unknown as typeof window.matchMedia;
}

afterEach(() => {
	setNavigatorStandalone(undefined);
});

describe("isSafari", () => {
	it("recognises Safari", () => {
		setUserAgent(SAFARI_MAC);
		expect(isSafari()).toBe(true);
	});

	it.each([
		["Chrome", CHROME_MAC],
		["Edge", EDGE_MAC],
		["Opera", OPERA_MAC],
		["Firefox", FIREFOX_MAC],
		["Chrome on Android", CHROME_ANDROID],
	])("rejects %s, whose user agent may carry a Safari token", (_name, ua) => {
		setUserAgent(ua);
		expect(isSafari()).toBe(false);
	});

	it("recognises a home-screen web app on iOS, whose user agent has no Safari token", () => {
		setUserAgent(IOS_HOME_SCREEN_APP);
		setNavigatorStandalone(true);
		expect(isSafari()).toBe(true);
	});
});

describe("isStandaloneDisplay", () => {
	it("is true when the display-mode is standalone", () => {
		setDisplayModeStandalone(true);
		expect(isStandaloneDisplay()).toBe(true);
	});

	it("is false in a browser tab", () => {
		setDisplayModeStandalone(false);
		expect(isStandaloneDisplay()).toBe(false);
	});

	it("falls back to navigator.standalone on iOS", () => {
		setDisplayModeStandalone(false);
		setNavigatorStandalone(true);
		expect(isStandaloneDisplay()).toBe(true);
	});
});
