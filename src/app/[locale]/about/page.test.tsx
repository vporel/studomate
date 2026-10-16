/** @jest-environment jsdom */
import routes from "@/app/routes";
import { APP_REPO_URL } from "@/app-info";
import { getMessages } from "@/i18n/messages";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import {
	arduinoPhoto,
	grafcetCapture,
	hmiCapture,
	ladderCapture,
	scene3dCapture,
} from "@/ui/components/public-pages/landing-content";
import About from "./page";

jest.mock("next-intl/server", () => ({
	getTranslations: ({
		locale,
		namespace,
	}: {
		locale: "fr" | "en";
		namespace: string;
	}) =>
		Promise.resolve(
			createTranslator({
				locale,
				messages: getMessages(locale),
				namespace: namespace as "public.about",
			}),
		),
	setRequestLocale: jest.fn(),
}));

jest.mock("@/ui/components/public-pages/PageTitle", () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

jest.mock("@/ui/components/public-pages/PublicLinkButton", () => ({
	__esModule: true,
	default: ({
		href,
		children,
	}: {
		href: string;
		children: React.ReactNode;
	}) => <a href={href}>{children}</a>,
}));

const renderAbout = async (locale: "fr" | "en") => {
	const ui = await About({ params: Promise.resolve({ locale }) });
	return render(
		<NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
			{ui}
		</NextIntlClientProvider>,
	);
};

describe("About page", () => {
	it.each(["fr", "en"] as const)(
		"renders one card per item of each section (%s)",
		async (locale) => {
			await renderAbout(locale);
			const about = getMessages(locale).public.about;

			for (const key of [
				"offeringItems",
				"valueItems",
				"ownershipItems",
				"audienceItems",
			] as const) {
				for (const item of about[key]) {
					expect(
						screen.getByRole("heading", { name: item.title }),
					).toBeTruthy();
				}
			}
		},
	);

	it("renders the editor captions, the extra differentiators and the causality chips", async () => {
		await renderAbout("fr");
		const about = getMessages("fr").public.about;

		for (const label of [
			...about.differentiatorEditors,
			...about.differentiatorItems,
			...about.causalityItems,
		]) {
			expect(screen.getByText(label)).toBeTruthy();
		}
	});

	it("captions each editor capture with its own label", async () => {
		const { container } = await renderAbout("fr");
		const about = getMessages("fr").public.about;
		const figures = container.querySelectorAll("figure");

		expect(figures).toHaveLength(about.differentiatorEditors.length);
		about.differentiatorEditors.forEach((label, i) => {
			expect(figures[i].textContent).toContain(label);
			expect(figures[i].querySelector("img")).not.toBeNull();
		});
	});

	it("shows the 3D scene and Arduino images on their cards, and the three editor captures", async () => {
		const { container } = await renderAbout("fr");
		const srcs = Array.from(container.querySelectorAll("img")).map((img) =>
			img.getAttribute("src"),
		);

		expect(srcs).toEqual(
			expect.arrayContaining([
				grafcetCapture,
				ladderCapture,
				hmiCapture,
				scene3dCapture,
				arduinoPhoto,
			]),
		);
		expect(srcs).toHaveLength(5);
		for (const img of container.querySelectorAll("img")) {
			expect(img.getAttribute("alt")).toBeTruthy();
		}
	});

	it("links the GitHub repository from the contact panel", async () => {
		const { container } = await renderAbout("fr");
		const link = screen.getByRole("link", { name: "Voir sur GitHub" });

		expect(link.getAttribute("href")).toBe(APP_REPO_URL);
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toContain("noopener");
		expect(link.querySelector("svg")).not.toBeNull();
		expect(container.contains(link)).toBe(true);
	});

	it("offers a button opening the app", async () => {
		await renderAbout("en");
		const link = screen.getByRole("link", { name: "Open the app" });

		expect(link.getAttribute("href")).toBe(routes.app());
	});

	it("links the contact call-to-action to /contact", async () => {
		await renderAbout("en");

		expect(
			screen.getByRole("link", { name: "Get in touch" }).getAttribute("href"),
		).toBe("/contact");
	});

	it("has as many icons as items in each icon-backed section", async () => {
		const { container } = await renderAbout("fr");
		const about = getMessages("fr").public.about;
		const cardCount =
			about.offeringItems.length +
			about.valueItems.length +
			about.ownershipItems.length +
			about.audienceItems.length;

		expect(container.querySelectorAll("h3.MuiTypography-h6").length).toBe(
			cardCount,
		);
		expect(container.querySelectorAll("h3.MuiTypography-h6 + p").length).toBe(
			cardCount,
		);
	});
});
