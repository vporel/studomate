/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import {
	PendingSystemBlockCreation,
	PendingSystemBlockEdit,
} from "@/ui/utils/ladder/ladder-system-block-drag";
import { CounterBlockParams } from "@/schemas/ladder/block.schema";
import { CounterType } from "@/schemas/ladder/function-blocks/counter.schema";
import SystemBlockDialog from "./SystemBlockDialog";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

const VARIANT_KEYS: Record<CounterType, string> = {
	CTU: "typeCTU",
	CTD: "typeCTD",
	CTUD: "typeCTUD",
};
const buildCreation = jest.fn(
	(name: string, counterType: CounterType): CounterBlockParams => ({
		name,
		counterType,
		control: "",
		pv: "",
	}),
);

function setup({
	pendingSystemBlockCreation = null,
	pendingSystemBlockEdit = null,
	isMnemonicTaken = jest.fn(() => false),
	showNote,
}: {
	pendingSystemBlockCreation?: PendingSystemBlockCreation | null;
	pendingSystemBlockEdit?: PendingSystemBlockEdit | null;
	isMnemonicTaken?: jest.Mock;
	showNote?: boolean;
} = {}) {
	const executeOperation = jest.fn();
	const setPendingSystemBlockCreation = jest.fn();
	const setPendingSystemBlockEdit = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ project: { isMnemonicTaken } }),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			pendingSystemBlockCreation,
			setPendingSystemBlockCreation,
			pendingSystemBlockEdit,
			setPendingSystemBlockEdit,
			commandsStackManager: { executeOperation },
		}),
	);

	renderWithI18n(
		<AppThemeProvider>
			<SystemBlockDialog<CounterBlockParams, CounterType>
				blockType="counter"
				i18nNamespace="ladderEditor.counterDialog"
				variants={["CTU", "CTD", "CTUD"]}
				variantKeys={VARIANT_KEYS}
				defaultVariant="CTD"
				showNote={showNote}
				readVariant={(initial) => initial.counterType}
				buildCreation={buildCreation}
				applyEdit={(initial, name, counterType) => ({
					...initial,
					name,
					counterType,
				})}
			/>
		</AppThemeProvider>,
	);

	return {
		executeOperation,
		setPendingSystemBlockCreation,
		setPendingSystemBlockEdit,
	};
}

const creation = (insert = jest.fn()): PendingSystemBlockCreation => ({
	blockType: "counter",
	insert,
});

const typeName = (value: string) =>
	fireEvent.change(screen.getByLabelText("Nom"), { target: { value } });

describe("SystemBlockDialog", () => {
	afterEach(() => jest.clearAllMocks());

	it("starts creation on the default variant", () => {
		const insert = jest.fn();
		setup({ pendingSystemBlockCreation: creation(insert) });

		typeName("Cpt1");
		fireEvent.click(screen.getByText("Créer"));

		expect(buildCreation).toHaveBeenCalledWith("Cpt1", "CTD");
		expect(insert).toHaveBeenCalledTimes(1);
	});

	it("hides the note unless showNote is set", () => {
		setup({ pendingSystemBlockCreation: creation() });

		expect(screen.queryByText(/front montant/)).not.toBeInTheDocument();
	});

	it("shows the note when showNote is set", () => {
		setup({ pendingSystemBlockCreation: creation(), showNote: true });

		expect(screen.getByText(/front montant/)).toBeInTheDocument();
	});

	it("inserts the variant picked by the user", () => {
		const insert = jest.fn();
		setup({ pendingSystemBlockCreation: creation(insert) });

		typeName("Cpt1");
		fireEvent.mouseDown(screen.getByRole("combobox"));
		fireEvent.click(screen.getByRole("option", { name: /^CTUD/ }));
		fireEvent.click(screen.getByText("Créer"));

		expect(buildCreation).toHaveBeenCalledWith("Cpt1", "CTUD");
	});

	it("disables Créer and shows an error for an invalid name", () => {
		const insert = jest.fn();
		setup({ pendingSystemBlockCreation: creation(insert) });

		typeName("1abc");

		expect(screen.getByText("Créer")).toBeDisabled();
		expect(screen.getByLabelText("Nom")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		fireEvent.keyDown(screen.getByLabelText("Nom"), { key: "Enter" });
		expect(insert).not.toHaveBeenCalled();
	});

	it("disables Créer and shows an error for a name already used", () => {
		setup({
			pendingSystemBlockCreation: creation(),
			isMnemonicTaken: jest.fn(() => true),
		});

		typeName("Cpt1");

		expect(screen.getByText(/déjà utilisé/)).toBeInTheDocument();
		expect(screen.getByText("Créer")).toBeDisabled();
	});

	it("submits with the Enter key when the name is valid", () => {
		const insert = jest.fn();
		const { setPendingSystemBlockCreation } = setup({
			pendingSystemBlockCreation: creation(insert),
		});

		typeName("Cpt1");
		fireEvent.keyDown(screen.getByLabelText("Nom"), { key: "Enter" });

		expect(insert).toHaveBeenCalledTimes(1);
		expect(setPendingSystemBlockCreation).toHaveBeenCalledWith(null);
	});

	it("closes without inserting when the window is dismissed", () => {
		const insert = jest.fn();
		const { setPendingSystemBlockCreation, setPendingSystemBlockEdit } = setup({
			pendingSystemBlockCreation: creation(insert),
		});

		typeName("Cpt1");
		fireEvent.click(screen.getByLabelText("Fermer"));

		expect(insert).not.toHaveBeenCalled();
		expect(setPendingSystemBlockCreation).toHaveBeenCalledWith(null);
		expect(setPendingSystemBlockEdit).toHaveBeenCalledWith(null);
	});

	it("allows saving an edition that keeps the current name even if it is registered", () => {
		const { executeOperation } = setup({
			pendingSystemBlockEdit: {
				blockType: "counter",
				elementId: "b1",
				initial: { name: "Cpt1", counterType: "CTU", control: "", pv: "" },
			},
			isMnemonicTaken: jest.fn(() => true),
		});

		expect(screen.getByText("Enregistrer")).toBeEnabled();
		fireEvent.click(screen.getByText("Enregistrer"));

		expect(executeOperation).toHaveBeenCalledTimes(1);
	});

	it("refuses an edition renamed to a name already used", () => {
		const { executeOperation } = setup({
			pendingSystemBlockEdit: {
				blockType: "counter",
				elementId: "b1",
				initial: { name: "Cpt1", counterType: "CTU", control: "", pv: "" },
			},
			isMnemonicTaken: jest.fn(() => true),
		});

		typeName("Cpt2");

		expect(screen.getByText("Enregistrer")).toBeDisabled();
		expect(executeOperation).not.toHaveBeenCalled();
	});
});
