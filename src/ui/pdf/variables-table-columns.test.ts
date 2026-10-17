import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import {
	buildVariableGroupSection,
	buildVariablesTableModel,
} from "./variables-table-pdf";

const labels = {
	mnemonic: "Mnémonique",
	type: "Type",
	address: "Adresse",
	declaredValue: "Valeur déclarée",
	comment: "Commentaire",
};

const headers = (model: { columns: { header: string }[] }) =>
	model.columns.map((c) => c.header);

describe("explicit table columns", () => {
	it("uses declared-value columns on an empty list when requested", () => {
		expect(
			headers(buildVariablesTableModel([], labels, "declaredValue")),
		).toEqual(["Mnémonique", "Type", "Valeur déclarée", "Commentaire"]);
	});

	it("uses address columns even when the list contains a constant", () => {
		const constant = VariableBuilder.buildConstant("c1", "K", "INT", "5");
		expect(
			headers(buildVariablesTableModel([constant], labels, "address")),
		).toEqual(["Mnémonique", "Type", "Adresse", "Commentaire"]);
	});

	it("derives the columns from the group", () => {
		expect(
			headers(buildVariableGroupSection("constant", [], "T", labels).table!),
		).toContain("Valeur déclarée");
		expect(
			headers(buildVariableGroupSection("input", [], "T", labels).table!),
		).toContain("Adresse");
	});
});
