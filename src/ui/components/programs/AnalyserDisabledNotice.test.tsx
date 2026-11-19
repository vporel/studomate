/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import { selectorImplementation } from "@tests/utils/store-mocks";
import {
	getAnalyserDisabledNoticeHidden,
	setAnalyserDisabledNoticeHidden,
} from "@/persistence/preferences.storage";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import AnalyserDisabledNotice from "./AnalyserDisabledNotice";

jest.mock("@/ui/components/projects/ProjectContext");

const TITLE = "Analyseur désactivé";

function setup(visible: boolean) {
	const setAnalyserDisabledNoticeVisible = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { analyserDisabledNoticeVisible: visible },
			setAnalyserDisabledNoticeVisible,
		}),
	);
	renderWithI18n(<AnalyserDisabledNotice />);
	return setAnalyserDisabledNoticeVisible;
}

describe("AnalyserDisabledNotice", () => {
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ restore: restoreLocalStorage } = installMemoryLocalStorage());
	});

	afterEach(() => restoreLocalStorage());

	it("stays closed until an analyser is disabled", () => {
		setup(false);

		expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
	});

	it("closes without hiding it for good by default", () => {
		const setVisible = setup(true);

		expect(screen.getByText(TITLE)).toBeInTheDocument();
		fireEvent.click(screen.getByText("Compris"));

		expect(setVisible).toHaveBeenCalledWith(false);
		expect(getAnalyserDisabledNoticeHidden()).toBe(false);
	});

	it("is hidden for good when 'Ne plus afficher' is checked", () => {
		const setVisible = setup(true);

		fireEvent.click(screen.getByLabelText("Ne plus afficher"));
		fireEvent.click(screen.getByText("Compris"));

		expect(setVisible).toHaveBeenCalledWith(false);
		expect(getAnalyserDisabledNoticeHidden()).toBe(true);
	});

	it("is not shown once the user hid it", () => {
		setAnalyserDisabledNoticeHidden();
		const setVisible = setup(true);

		expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
		expect(setVisible).toHaveBeenCalledWith(false);
	});
});
