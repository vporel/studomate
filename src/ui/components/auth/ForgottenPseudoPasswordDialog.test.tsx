/**
 * @jest-environment jsdom
 */
import { LOCALES, type Locale } from "@/i18n/config";
import { useLocale } from "next-intl";
import { fireEvent, render, screen } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import ForgottenPseudoPasswordDialog from "./ForgottenPseudoPasswordDialog";

jest.mock("next-intl", () => ({
	...jest.requireActual("next-intl"),
	useLocale: jest.fn(),
}));

const CONTACT_PATH: Record<Locale, string> = {
	fr: "/contact",
	en: "/en/contact",
	es: "/es/contacto",
};

function renderDialog(locale: Locale, onClose = jest.fn()) {
	(useLocale as jest.Mock).mockReturnValue(locale);
	render(<ForgottenPseudoPasswordDialog open onClose={onClose} />, {
		wrapper: i18nWrapper(locale),
	});
	return onClose;
}

describe("ForgottenPseudoPasswordDialog", () => {
	it("renders nothing when closed", () => {
		(useLocale as jest.Mock).mockReturnValue("fr");
		render(<ForgottenPseudoPasswordDialog open={false} onClose={jest.fn()} />, {
			wrapper: i18nWrapper("fr"),
		});
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it.each(LOCALES)(
		"links to the %s contact page on the forgotten-password topic, in a new tab",
		(locale) => {
			renderDialog(locale);
			const link = screen.getByRole("link");
			expect(link).toHaveAttribute(
				"href",
				`${CONTACT_PATH[locale]}?topic=forgotten-password`,
			);
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
		},
	);

	it("closes through the close button", () => {
		const onClose = renderDialog("fr");
		fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
