/**
 * @jest-environment jsdom
 */
import { LOCALES } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import WHATS_NEW_SLIDE_IDS from "@/whats-new/whats-new-slides";
import { fireEvent, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import WhatsNewModal from "./WhatsNewModal";

const messages = getMessages("fr");

function renderModal(onClose = jest.fn()) {
	const view = render(
		<NextIntlClientProvider locale="fr" messages={messages}>
			<WhatsNewModal onClose={onClose} />
		</NextIntlClientProvider>,
	);
	return { ...view, onClose };
}

describe("WhatsNewModal", () => {
	it("starts on the first slide with the previous button disabled", () => {
		const { getByText } = renderModal();
		expect(
			getByText(messages.whatsNew.slides[WHATS_NEW_SLIDE_IDS[0]].title),
		).toBeTruthy();
		expect(
			(getByText(messages.whatsNew.previous) as HTMLButtonElement).disabled,
		).toBe(true);
	});

	it("walks through every slide, then closes on the last one", () => {
		const { getByText, onClose } = renderModal();
		for (const id of WHATS_NEW_SLIDE_IDS.slice(1)) {
			fireEvent.click(getByText(messages.whatsNew.next));
			expect(getByText(messages.whatsNew.slides[id].title)).toBeTruthy();
		}
		expect(onClose).not.toHaveBeenCalled();
		fireEvent.click(getByText(messages.whatsNew.done));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("closes from the header close button", () => {
		const { getByLabelText, onClose } = renderModal();
		fireEvent.click(getByLabelText(messages.common.modal.close));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("goes back to the previous slide", () => {
		const { getByText } = renderModal();
		fireEvent.click(getByText(messages.whatsNew.next));
		fireEvent.click(getByText(messages.whatsNew.previous));
		expect(
			getByText(messages.whatsNew.slides[WHATS_NEW_SLIDE_IDS[0]].title),
		).toBeTruthy();
	});
});

describe("what's new slides", () => {
	it.each(LOCALES)("%s has a title and a body for every slide", (locale) => {
		const { slides } = getMessages(locale).whatsNew;
		expect(Object.keys(slides).sort()).toEqual([...WHATS_NEW_SLIDE_IDS].sort());
		for (const id of WHATS_NEW_SLIDE_IDS) {
			const slide = (slides as Record<string, { title: string; body: string }>)[
				id
			];
			expect(slide.title.trim()).not.toBe("");
			expect(slide.body.trim()).not.toBe("");
		}
	});
});
