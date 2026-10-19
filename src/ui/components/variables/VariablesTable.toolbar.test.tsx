/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
import Variable from "@/schemas/variable/variable.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useEffect } from "react";
import { useProjectStore } from "../projects/ProjectContext";
import VariablesTable from "./VariablesTable";

const mounts = jest.fn();
const renderedSelections: unknown[] = [];

jest.mock("../projects/ProjectContext");
jest.mock("./GridToolBar", () => {
	function FakeToolBar(props: { rowSelectionModel: unknown }) {
		useEffect(() => {
			mounts();
		}, []);
		renderedSelections.push(props.rowSelectionModel);
		return <div data-testid="toolbar" />;
	}
	return { __esModule: true, default: FakeToolBar };
});

describe("VariablesTable toolbar", () => {
	it("is not remounted when the selection changes and receives the new selection", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				variablesManager: {
					existsByMnemonic: () => undefined,
					isMnemonicUsedByBlock: () => false,
					getByAddress: () => null,
					removeVariables: jest.fn(),
				},
				project: {
					variables: [
						new Variable({
							id: "v1",
							mnemonic: "I0",
							zone: "logic-input",
							type: "BOOL",
							dialect: Dialect.FR,
						}),
					],
				},
				mode: ProjectMode.DESIGN,
			}),
		);
		renderWithI18n(
			<VariablesTable zones={["logic-input"]} pageTitle="Variables" />,
		);
		expect(screen.getByTestId("toolbar")).toBeTruthy();
		expect(mounts).toHaveBeenCalledTimes(1);
		const before = renderedSelections.length;

		fireEvent.click(screen.getAllByRole("checkbox")[1]);

		expect(renderedSelections.length).toBeGreaterThan(before);
		expect(mounts).toHaveBeenCalledTimes(1);
	});
});
