/** @jest-environment jsdom */
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import StorageLocationRadioGroup from "./StorageLocationRadioGroup";

jest.mock("@/ui/stores/auth/auth.store");

const setAuthModalVisible = jest.fn();

function setup({
	value = "local",
	authenticated = false,
	onChange = jest.fn(),
}: {
	value?: "local" | "cloud";
	authenticated?: boolean;
	onChange?: jest.Mock;
} = {}) {
	(useAuthStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			user: authenticated ? { id: "u1" } : null,
			setAuthModalVisible,
		}),
	);
	renderWithI18n(
		<StorageLocationRadioGroup value={value} onChange={onChange} />,
	);
	return { onChange };
}

describe("StorageLocationRadioGroup", () => {
	beforeEach(() => setAuthModalVisible.mockClear());

	it("checks the radio matching the value", () => {
		setup({ value: "cloud", authenticated: true });

		expect(screen.getByRole("radio", { name: "Dans le cloud" })).toBeChecked();
		expect(
			screen.getByRole("radio", { name: "Sur cet appareil" }),
		).not.toBeChecked();
	});

	it("reports the chosen location", () => {
		const { onChange } = setup({ value: "local" });

		fireEvent.click(screen.getByRole("radio", { name: "Dans le cloud" }));

		expect(onChange).toHaveBeenCalledWith("cloud");
	});

	it("does not ask to log in for the local location", () => {
		setup({ value: "local" });

		expect(screen.queryByText("Connexion requise.")).toBeNull();
	});

	it("does not ask to log in when the user is authenticated", () => {
		setup({ value: "cloud", authenticated: true });

		expect(screen.queryByText("Connexion requise.")).toBeNull();
	});

	it("offers to log in for the cloud when anonymous", () => {
		setup({ value: "cloud" });

		expect(screen.getByText("Connexion requise.")).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

		expect(setAuthModalVisible).toHaveBeenCalledWith(
			true,
			"Connectez-vous pour enregistrer dans le cloud.",
		);
	});
});
