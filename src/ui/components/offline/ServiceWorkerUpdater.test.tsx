/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { toast } from "react-toastify";
import { isStandaloneDisplay } from "@/ui/lib/platform";
import reloadPage from "@/ui/lib/reload-page";
import ServiceWorkerUpdater from "./ServiceWorkerUpdater";

const flushDraft = jest.fn();
const listeners = new Map<string, () => void>();
const serwist = {
	addEventListener: jest.fn((type: string, listener: () => void) =>
		listeners.set(type, listener),
	),
	removeEventListener: jest.fn((type: string) => listeners.delete(type)),
	messageSkipWaiting: jest.fn(),
};

jest.mock("react-toastify", () => ({
	toast: { info: jest.fn(), warning: jest.fn() },
}));
jest.mock("@serwist/turbopack/react", () => ({
	useSerwist: () => ({ serwist }),
}));
jest.mock("@/ui/components/projects/ProjectContext", () => ({
	useProjectContext: () => ({
		getState: () => ({ lifecycleManager: { flushDraft } }),
	}),
}));

jest.mock("@/ui/lib/reload-page");
jest.mock("@/ui/lib/platform", () => ({
	...jest.requireActual("@/ui/lib/platform"),
	isStandaloneDisplay: jest.fn(),
}));

/** The `onClick` the update toast was given. */
function acceptUpdate() {
	const [, options] = (toast.info as jest.Mock).mock.calls[0];
	options.onClick();
}

describe("ServiceWorkerUpdater", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		listeners.clear();
		flushDraft.mockReturnValue(true);
		(isStandaloneDisplay as jest.Mock).mockReturnValue(true);
	});

	it("does not listen for updates in a browser tab", () => {
		(isStandaloneDisplay as jest.Mock).mockReturnValue(false);

		renderWithI18n(<ServiceWorkerUpdater />);

		expect(serwist.addEventListener).not.toHaveBeenCalled();
		expect(toast.info).not.toHaveBeenCalled();
	});

	it("offers the update when a new service worker is waiting, without activating it", () => {
		renderWithI18n(<ServiceWorkerUpdater />);

		listeners.get("waiting")!();

		expect(toast.info).toHaveBeenCalledWith(
			"Nouvelle version disponible : cliquez ici pour recharger.",
			expect.objectContaining({ autoClose: false }),
		);
		expect(serwist.messageSkipWaiting).not.toHaveBeenCalled();
	});

	it("writes the draft, then activates the new worker once the user accepts", () => {
		renderWithI18n(<ServiceWorkerUpdater />);
		listeners.get("waiting")!();

		acceptUpdate();

		expect(flushDraft).toHaveBeenCalledTimes(1);
		expect(serwist.messageSkipWaiting).toHaveBeenCalledTimes(1);
	});

	it("keeps the current version while pending changes could not be put in a draft", () => {
		flushDraft.mockReturnValue(false);
		renderWithI18n(<ServiceWorkerUpdater />);
		listeners.get("waiting")!();

		acceptUpdate();
		listeners.get("controlling")!();

		expect(serwist.messageSkipWaiting).not.toHaveBeenCalled();
		expect(reloadPage).not.toHaveBeenCalled();
		expect(toast.warning).toHaveBeenCalledWith(
			"Enregistrez votre projet avant de recharger : vos modifications seraient perdues.",
		);
	});

	it("reloads only the tab that accepted the update", () => {
		renderWithI18n(<ServiceWorkerUpdater />);
		listeners.get("waiting")!();

		listeners.get("controlling")!();
		expect(reloadPage).not.toHaveBeenCalled();

		acceptUpdate();
		listeners.get("controlling")!();
		expect(reloadPage).toHaveBeenCalledTimes(1);
	});

	it("stops listening on unmount", () => {
		const { unmount } = renderWithI18n(<ServiceWorkerUpdater />);

		unmount();

		expect(listeners.size).toBe(0);
	});
});
