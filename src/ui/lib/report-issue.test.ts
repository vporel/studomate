/**
 * @jest-environment jsdom
 */
import { APP_CONTACT_EMAIL } from "@/app-info";
import buildReportIssueMailto from "./report-issue";

describe("buildReportIssueMailto", () => {
	it("cible l'adresse de contact avec un sujet et un corps encodés", () => {
		const mailto = buildReportIssueMailto();
		expect(mailto.startsWith(`mailto:${APP_CONTACT_EMAIL}?`)).toBe(true);

		const params = new URLSearchParams(mailto.split("?")[1]);
		expect(params.get("subject")).toBe("[Studomate] Signalement de problème");
		expect(params.get("body")).toContain("Étapes pour le reproduire");
	});

	it("inclut l'URL courante et le navigateur côté client", () => {
		const params = new URLSearchParams(buildReportIssueMailto().split("?")[1]);
		const body = params.get("body") ?? "";
		expect(body).toContain(`Page : ${window.location.href}`);
		expect(body).toContain(`Navigateur : ${window.navigator.userAgent}`);
	});
});
