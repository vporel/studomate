import { APP_VERSION } from "@/app-info";
import { WHATS_NEW_VERSION } from "./whats-new-slides";

function parse(version: string): number[] {
	return version.replace(/^v/, "").split(".").map(Number);
}

describe("WHATS_NEW_VERSION", () => {
	it("has the vX.Y.Z format, like APP_VERSION", () => {
		expect(WHATS_NEW_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
		expect(APP_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
	});

	it("never exceeds APP_VERSION", () => {
		const news = parse(WHATS_NEW_VERSION);
		const app = parse(APP_VERSION);
		const firstDifference = news.findIndex((part, i) => part !== app[i]);
		if (firstDifference === -1) return;
		expect(news[firstDifference]).toBeLessThan(app[firstDifference]);
	});
});
