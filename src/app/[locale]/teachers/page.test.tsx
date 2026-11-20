/** @jest-environment jsdom */
import routes from "@/app/routes";
import { getMessages } from "@/i18n/messages";
import { render, screen } from "@testing-library/react";
import { hasNoSkippedLevel, headingLevels } from "@tests/utils/headings";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import Teachers, { generateMetadata } from "./page";

jest.mock("next-intl/server", () => ({
	getTranslations: ({
		locale,
		namespace,
	}: {
		locale: "fr" | "en" | "es";
		namespace: string;
	}) =>
		Promise.resolve(
			createTranslator({
				locale,
				messages: getMessages(locale),
				namespace: namespace as "public.teachers",
			}),
		),
	setRequestLocale: jest.fn(),
}));

const renderTeachers = async (locale: "fr" | "en" | "es") => {
	const ui = await Teachers({ params: Promise.resolve({ locale }) });
	return render(
		<NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
			{ui}
		</NextIntlClientProvider>,
	);
};

describe("Teachers page", () => {
	it.each(["fr", "en", "es"] as const)(
		"has a single h1 and no skipped heading level (%s)",
		async (locale) => {
			const { container } = await renderTeachers(locale);
			const levels = headingLevels(container);

			expect(levels.filter((l) => l === 1)).toHaveLength(1);
			expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
				getMessages(locale).public.teachers.title,
			);
			expect(hasNoSkippedLevel(levels)).toBe(true);
		},
	);

	it("renders every section with all its items", async () => {
		await renderTeachers("fr");
		const { sections } = getMessages("fr").public.teachers;

		for (const section of sections) {
			expect(
				screen.getByRole("heading", { level: 2, name: section.title }),
			).toBeTruthy();
			for (const item of section.items) {
				expect(screen.getByText(item)).toBeTruthy();
			}
		}
	});

	it("names the targeted programmes in the introduction", async () => {
		await renderTeachers("fr");
		const intro = screen.getByText(getMessages("fr").public.teachers.intro);

		for (const programme of [
			"BTS CRSA",
			"BTS ATI",
			"bac pro MELEC",
			"BUT GEII",
		]) {
			expect(intro.textContent).toContain(programme);
		}
	});

	it("links every training module with its topic label, and the glossary", async () => {
		await renderTeachers("fr");
		const { landing, teachers } = getMessages("fr").public;

		expect(
			screen.getByRole("link", { name: landing.trainingA1LinkLabel }),
		).toHaveAttribute("href", "/formations/a1");
		expect(
			screen.getByRole("link", { name: landing.trainingA5LinkLabel }),
		).toHaveAttribute("href", "/formations/a5");
		expect(
			screen.getByRole("link", { name: teachers.glossaryLink }),
		).toHaveAttribute("href", "/formations/glossaire");
	});

	it("puts the same questions and answers in the visible FAQ and in its JSON-LD", async () => {
		const { container } = await renderTeachers("en");
		const { faq } = getMessages("en").public.teachers;
		const script = container.querySelector(
			'script[type="application/ld+json"]',
		);
		const jsonLd = JSON.parse(script?.textContent ?? "{}");

		expect(jsonLd["@type"]).toBe("FAQPage");
		expect(
			jsonLd.mainEntity.map(
				(q: { name: string; acceptedAnswer: { text: string } }) => ({
					question: q.name,
					answer: q.acceptedAnswer.text,
				}),
			),
		).toEqual(faq);
		for (const { question, answer } of faq) {
			expect(
				screen.getByRole("heading", { level: 3, name: question }),
			).toBeTruthy();
			expect(screen.getByText(answer)).toBeTruthy();
		}
	});

	it("offers the app and the training as calls to action", async () => {
		await renderTeachers("en");

		expect(screen.getByRole("link", { name: "Open the app" })).toHaveAttribute(
			"href",
			routes.app(),
		);
		expect(
			screen.getByRole("link", { name: "See the training" }),
		).toHaveAttribute("href", "/en/training");
	});

	it.each([
		[
			"fr",
			"https://studomate.com/enseignants",
			"Simulateur GRAFCET et Ladder pour enseignants",
		],
		[
			"en",
			"https://studomate.com/en/teachers",
			"GRAFCET and ladder logic simulator for teachers",
		],
	] as const)(
		"has its own title, description and localized URLs (%s)",
		async (locale, canonical, title) => {
			const metadata = await generateMetadata({
				params: Promise.resolve({ locale }),
			});

			expect(metadata.title).toBe(title);
			expect(metadata.description).toBe(
				getMessages(locale).public.metadata.teachersDescription,
			);
			expect(metadata.alternates?.canonical).toBe(canonical);
			expect(metadata.alternates?.languages).toEqual({
				fr: "https://studomate.com/enseignants",
				en: "https://studomate.com/en/teachers",
				es: "https://studomate.com/es/docentes",
				"x-default": "https://studomate.com/enseignants",
			});
		},
	);
});
