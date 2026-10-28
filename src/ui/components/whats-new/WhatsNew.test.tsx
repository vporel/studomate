/**
 * @jest-environment jsdom
 */
import { APP_VERSION } from "@/app-info";
import { whatsNewStore } from "@/ui/stores/whats-new/whats-new.store";
import { act, render, waitFor } from "@testing-library/react";
import WhatsNew from "./WhatsNew";

jest.mock("next/dynamic", () => ({
	__esModule: true,
	default: () => () => <div data-testid="modal" />,
}));

describe("WhatsNew", () => {
	beforeEach(() => {
		localStorage.clear();
		act(() => whatsNewStore.getState().close());
	});

	it("shows the modal when the store opens it, whatever the stored version", () => {
		localStorage.setItem("studomate_app_version", APP_VERSION);
		const { queryByTestId } = render(<WhatsNew />);
		expect(queryByTestId("modal")).toBeNull();
		act(() => whatsNewStore.getState().open());
		expect(queryByTestId("modal")).toBeTruthy();
	});

	it("records the version silently on the first visit with no project", async () => {
		const { queryByTestId } = render(<WhatsNew />);
		await waitFor(() =>
			expect(localStorage.getItem("studomate_app_version")).toBe(APP_VERSION),
		);
		expect(queryByTestId("modal")).toBeNull();
	});

	it("shows the modal and records the version when none is stored but projects exist", async () => {
		localStorage.setItem(
			"studomate_projects_data",
			JSON.stringify({ p1: { name: "A" } }),
		);
		const { findByTestId } = render(<WhatsNew />);
		expect(await findByTestId("modal")).toBeTruthy();
		expect(localStorage.getItem("studomate_app_version")).toBe(APP_VERSION);
	});

	it("does nothing when the stored version is the current one", () => {
		localStorage.setItem("studomate_app_version", APP_VERSION);
		const { queryByTestId } = render(<WhatsNew />);
		expect(queryByTestId("modal")).toBeNull();
		expect(localStorage.getItem("studomate_app_version")).toBe(APP_VERSION);
	});

	it("updates the stored version and shows the modal when it differs", async () => {
		localStorage.setItem("studomate_app_version", "v0.0.1");
		const { findByTestId } = render(<WhatsNew />);
		expect(await findByTestId("modal")).toBeTruthy();
		expect(localStorage.getItem("studomate_app_version")).toBe(APP_VERSION);
	});
});
