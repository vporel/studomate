/** @jest-environment jsdom */
import { Dialect } from "@/expression-language/dialect.enum";
import Variable from "@/schemas/variable/variable.schema";
import { render, screen } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import {
	VariableSelectorOption,
	VariableSelectorPaper,
	VariableSelectorPaperContext,
} from "./VariableSelectorPopup";

const variable = new Variable({
	id: "v1",
	mnemonic: "M0",
	zone: "memory",
	type: "BOOL",
	dialect: Dialect.FR,
});

describe("VariableSelectorPaper", () => {
	function renderPaper(isEmpty: boolean) {
		return render(
			<VariableSelectorPaperContext.Provider
				value={{ activeColumns: ["mnemonic", "type"], isEmpty }}
			>
				<VariableSelectorPaper>
					<div>suggestions</div>
				</VariableSelectorPaper>
			</VariableSelectorPaperContext.Provider>,
			{ wrapper: i18nWrapper() },
		);
	}

	it("shows a header row for the active columns above the children", () => {
		renderPaper(false);
		expect(screen.getByText("Mnémonique")).toBeInTheDocument();
		expect(screen.getByText("Type")).toBeInTheDocument();
		expect(screen.getByText("suggestions")).toBeInTheDocument();
	});

	it("renders nothing when the suggestion list is empty", () => {
		const { container } = renderPaper(true);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders nothing by default context (no columns)", () => {
		render(
			<VariableSelectorPaper>
				<div>suggestions</div>
			</VariableSelectorPaper>,
			{ wrapper: i18nWrapper() },
		);
		expect(screen.queryByText("Mnémonique")).not.toBeInTheDocument();
		expect(screen.getByText("suggestions")).toBeInTheDocument();
	});
});

describe("VariableSelectorOption", () => {
	it("renders one cell per active column and forwards the li props", () => {
		render(
			<VariableSelectorOption
				optionProps={{ key: "k", id: "opt-1", role: "option" }}
				option={variable}
				activeColumns={["address", "mnemonic", "type", "scope"]}
			/>,
			{ wrapper: i18nWrapper() },
		);
		const item = screen.getByRole("option");
		expect(item).toHaveAttribute("id", "opt-1");
		expect(item).toHaveStyle({ padding: "0px" });
		expect(screen.getByText("—")).toBeInTheDocument();
		expect(screen.getByText("M0")).toBeInTheDocument();
		expect(screen.getByText("BOOL")).toBeInTheDocument();
		expect(screen.getByText("Mémoire")).toBeInTheDocument();
	});

	it("omits inactive columns", () => {
		render(
			<VariableSelectorOption
				optionProps={{ role: "option" }}
				option={variable}
				activeColumns={["mnemonic"]}
			/>,
			{ wrapper: i18nWrapper() },
		);
		expect(screen.getByText("M0")).toBeInTheDocument();
		expect(screen.queryByText("BOOL")).not.toBeInTheDocument();
	});
});
