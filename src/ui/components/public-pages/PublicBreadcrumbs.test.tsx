/** @jest-environment jsdom */
import { getMessages } from "@/i18n/messages";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import PublicBreadcrumbs from "./PublicBreadcrumbs";

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
				namespace: namespace as "public.breadcrumb",
			}),
		),
}));

jest.mock("./PublicLink", () => ({
	__esModule: true,
	default: ({
		href,
		children,
	}: {
		href: string;
		children: React.ReactNode;
	}) => <a href={href}>{children}</a>,
}));

const renderBreadcrumbs = async (
	props: Parameters<typeof PublicBreadcrumbs>[0],
) => {
	const ui = await PublicBreadcrumbs(props);
	return render(
		<NextIntlClientProvider
			locale={props.locale}
			messages={getMessages(props.locale)}
		>
			{ui}
		</NextIntlClientProvider>,
	);
};

describe("PublicBreadcrumbs", () => {
	it("renders a labelled nav with linked ancestors and the current page as text", async () => {
		await renderBreadcrumbs({
			locale: "fr",
			ancestors: [{ label: "Formations", href: "/training" }],
			current: { label: "Module A1", href: "/training/a1" },
		});

		const nav = screen.getByRole("navigation", { name: "Fil d'Ariane" });
		expect(nav).toBeTruthy();
		expect(screen.getByRole("link", { name: "Formations" })).toHaveAttribute(
			"href",
			"/training",
		);
		const current = screen.getByText("Module A1");
		expect(current).toHaveAttribute("aria-current", "page");
		expect(screen.queryByRole("link", { name: "Module A1" })).toBeNull();
	});

	it("uses the English label", async () => {
		await renderBreadcrumbs({
			locale: "en",
			ancestors: [{ label: "Training", href: "/training" }],
		});

		expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
	});

	it("links every ancestor and marks no current page when none is given", async () => {
		await renderBreadcrumbs({
			locale: "fr",
			ancestors: [
				{ label: "Formations", href: "/training" },
				{ label: "Module A1", href: "/training/a1" },
			],
		});

		expect(screen.getAllByRole("link")).toHaveLength(2);
		expect(document.querySelector("[aria-current]")).toBeNull();
	});

	it("emits a JSON-LD list matching the visible items", async () => {
		const { container } = await renderBreadcrumbs({
			locale: "fr",
			ancestors: [{ label: "Formations", href: "/training" }],
			current: { label: "Module A1", href: "/training/a1" },
		});

		const data = JSON.parse(
			container.querySelector('script[type="application/ld+json"]')!
				.textContent!,
		);
		expect(data.itemListElement.map((i: { name: string }) => i.name)).toEqual([
			"Formations",
			"Module A1",
		]);
	});
});
