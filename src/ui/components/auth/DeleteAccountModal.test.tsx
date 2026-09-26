/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import DeleteAccountModal from "./DeleteAccountModal";
import { toast } from "react-toastify";

const mockDeleteAccount = jest.fn();

jest.mock("@/ui/stores/auth/auth.store", () => ({
	useAuthStore: (selector: any) =>
		selector({ deleteAccount: mockDeleteAccount }),
}));

jest.mock("react-toastify", () => ({ toast: { success: jest.fn() } }));

function setup({ cloudProjectCount = 0, onClose = jest.fn() } = {}) {
	renderWithI18n(
		<DeleteAccountModal
			open
			cloudProjectCount={cloudProjectCount}
			onClose={onClose}
		/>,
	);
	return { onClose };
}

const typePassword = (value: string) =>
	fireEvent.change(screen.getByLabelText(/Confirmez avec votre mot de passe/), {
		target: { value },
	});

describe("DeleteAccountModal", () => {
	afterEach(() => jest.clearAllMocks());

	it("mentions the repatriation of the cloud projects when there are some", () => {
		setup({ cloudProjectCount: 3 });

		expect(screen.getByText(/Vos 3 projets cloud seront rapatriés/)).toBeTruthy();
	});

	it("says local projects are untouched when there is no cloud project", () => {
		setup({ cloudProjectCount: 0 });

		expect(screen.getByText(/Vos projets locaux ne sont pas concernés/)).toBeTruthy();
		expect(screen.queryByText(/rapatrié/)).toBeNull();
	});

	it("disables the confirm button until a password is typed", () => {
		setup();
		const confirm = screen.getByText("Supprimer définitivement") as HTMLButtonElement;

		expect(confirm.closest("button")!.disabled).toBe(true);
		typePassword("secret");
		expect(confirm.closest("button")!.disabled).toBe(false);
	});

	it("deletes the account with the typed password and announces it", async () => {
		mockDeleteAccount.mockResolvedValue({ ok: true });
		setup();

		typePassword("secret");
		fireEvent.click(screen.getByText("Supprimer définitivement"));

		await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith("secret"));
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Votre compte a été supprimé."),
		);
	});

	it("shows the error and announces nothing when the deletion fails", async () => {
		mockDeleteAccount.mockResolvedValue({ ok: false, code: "wrongPassword" });
		setup();

		typePassword("nope");
		fireEvent.click(screen.getByText("Supprimer définitivement"));

		expect(await screen.findByText("Mot de passe incorrect.")).toBeTruthy();
		expect(toast.success).not.toHaveBeenCalled();
	});

	it("closes on cancel", () => {
		const { onClose } = setup();

		fireEvent.click(screen.getByText("Annuler"));

		expect(onClose).toHaveBeenCalled();
	});
});
