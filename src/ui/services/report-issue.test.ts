/**
 * @jest-environment jsdom
 */
import { APP_CONTACT_EMAIL } from "@/app-info";
import buildReportIssueMailto, { openReportIssue } from "./report-issue";

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

describe("openReportIssue", () => {
	afterEach(() => {
		delete window.umami;
		jest.restoreAllMocks();
	});

	it("enregistre l'événement et ouvre le mailto dans un nouvel onglet", () => {
		const track = jest.fn();
		window.umami = { track };
		const open = jest.spyOn(window, "open").mockImplementation(() => null);

		openReportIssue();

		expect(track).toHaveBeenCalledWith("feedback-opened", undefined);
		expect(open).toHaveBeenCalledWith(
			expect.stringMatching(/^mailto:/),
			"_blank",
			"noopener,noreferrer",
		);
	});
});
