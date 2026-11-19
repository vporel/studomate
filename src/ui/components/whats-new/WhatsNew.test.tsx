/**
 * @jest-environment jsdom
 */
import { APP_VERSION } from "@/app-info";
import { WHATS_NEW_VERSION } from "@/whats-new/whats-new-slides";
import { whatsNewStore } from "@/ui/stores/whats-new/whats-new.store";
import { act, render, waitFor } from "@testing-library/react";
import WhatsNew from "./WhatsNew";

jest.mock("next/dynamic", () => ({
	__esModule: true,
	default: () => () => <div data-testid="modal" />,
}));

const LAYOUT_KEY = "studomate_local_storage_version";
const WHATS_NEW_KEY = "studomate_whats_new_version";
const APP_KEY = "studomate_app_version";

describe("WhatsNew", () => {
	beforeEach(() => {
		localStorage.clear();
		act(() => whatsNewStore.getState().close());
	});

	it("shows the modal when the store opens it, whatever the stored version", () => {
		localStorage.setItem(WHATS_NEW_KEY, WHATS_NEW_VERSION);
		const { queryByTestId } = render(<WhatsNew />);
		expect(queryByTestId("modal")).toBeNull();
		act(() => whatsNewStore.getState().open());
		expect(queryByTestId("modal")).toBeTruthy();
	});

	it("records both versions silently on the first visit with no project", async () => {
		const { queryByTestId } = render(<WhatsNew />);
		await waitFor(() =>
			expect(localStorage.getItem(WHATS_NEW_KEY)).toBe(WHATS_NEW_VERSION),
		);
		expect(localStorage.getItem(APP_KEY)).toBe(APP_VERSION);
		expect(queryByTestId("modal")).toBeNull();
	});

	it("shows the modal and records the version when none is stored but projects exist", async () => {
		localStorage.setItem(LAYOUT_KEY, "2");
		localStorage.setItem(
			"studomate_projects_data",
			JSON.stringify({ p1: { name: "A" } }),
		);
		const { findByTestId } = render(<WhatsNew />);
		expect(await findByTestId("modal")).toBeTruthy();
		expect(localStorage.getItem(WHATS_NEW_KEY)).toBe(WHATS_NEW_VERSION);
	});

	it("does nothing when the stored news version is the current one", async () => {
		localStorage.setItem(LAYOUT_KEY, "2");
		localStorage.setItem(WHATS_NEW_KEY, WHATS_NEW_VERSION);
		const { queryByTestId } = render(<WhatsNew />);
		await waitFor(() =>
			expect(localStorage.getItem(APP_KEY)).toBe(APP_VERSION),
		);
		expect(queryByTestId("modal")).toBeNull();
		expect(localStorage.getItem(WHATS_NEW_KEY)).toBe(WHATS_NEW_VERSION);
	});

	it("updates the stored news version and shows the modal when it differs", async () => {
		localStorage.setItem(LAYOUT_KEY, "2");
		localStorage.setItem(WHATS_NEW_KEY, "v0.0.1");
		const { findByTestId } = render(<WhatsNew />);
		expect(await findByTestId("modal")).toBeTruthy();
		expect(localStorage.getItem(WHATS_NEW_KEY)).toBe(WHATS_NEW_VERSION);
	});

	it("does not show the modal to an existing browser whose layout still has to be migrated", async () => {
		localStorage.setItem(LAYOUT_KEY, "1");
		localStorage.setItem(APP_KEY, "v1.7.1");
		localStorage.setItem(
			"studomate_projects_data",
			JSON.stringify({ p1: { name: "A" } }),
		);
		const { queryByTestId } = render(<WhatsNew />);
		await waitFor(() =>
			expect(localStorage.getItem(WHATS_NEW_KEY)).toBe(WHATS_NEW_VERSION),
		);
		expect(localStorage.getItem(APP_KEY)).toBe(APP_VERSION);
		expect(queryByTestId("modal")).toBeNull();
	});
});
