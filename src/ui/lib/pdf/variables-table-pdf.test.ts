import Variable from "@/schemas/variable/variable.schema";
import {
	buildProjectVariablesSections,
	buildVariableGroupSection,
	buildVariablesTableModel,
	buildVariablesTableSection,
} from "./variables-table-pdf";

const labels = {
	mnemonic: "Mnémonique",
	type: "Type",
	address: "Adresse",
	comment: "Commentaire",
};

describe("buildVariablesTableModel", () => {
	it("trie les variables par mnémonique et remplit les colonnes", () => {
		const model = buildVariablesTableModel(
			[
				new Variable("v2", "ZEBRE", "memory", "BOOL"),
				new Variable("v1", "ALPHA", "memory", "INT"),
			],
			labels,
		);
		expect(model.columns.map((c) => c.header)).toEqual([
			"Mnémonique",
			"Type",
			"Adresse",
			"Commentaire",
		]);
		expect(model.rows.map((r) => r[0])).toEqual(["ALPHA", "ZEBRE"]);
	});

	it("reprend adresse et commentaire, vides si absents", () => {
		const withData = new Variable("v1", "M0", "memory", "BOOL");
		withData.address = "%M0";
		withData.comment = "un commentaire";
		const bare = new Variable("v2", "M1", "memory", "BOOL");

		const model = buildVariablesTableModel([withData, bare], labels);
		expect(model.rows[0]).toEqual(["M0", "BOOL", "%M0", "un commentaire"]);
		expect(model.rows[1]).toEqual(["M1", "BOOL", "", ""]);
	});
});

describe("buildVariablesTableSection", () => {
	it("produit une section paysage portant un tableau", () => {
		const section = buildVariablesTableSection("Titre", [], labels);
		expect(section.orientation).toBe("landscape");
		expect(section.table).toBeDefined();
		expect(section.scene).toBeUndefined();
	});
});

describe("buildVariableGroupSection", () => {
	it("ne garde que les variables du groupe demandé, hors variables de bloc", () => {
		const section = buildVariableGroupSection(
			"input",
			[
				new Variable("v1", "I0", "logic-input", "BOOL"),
				new Variable("v2", "AI0", "analog-input", "INT"),
				new Variable("v3", "M0", "memory", "BOOL"),
				new Variable("v4", "T.Q", "logic-input", "BOOL", { id: "b1" }),
			],
			"Entrées",
			labels,
		);
		expect(section.title).toBe("Entrées");
		expect(section.orientation).toBe("landscape");
		expect(section.table!.rows.map((r) => r[0])).toEqual(["AI0", "I0"]);
	});
});

describe("buildProjectVariablesSections", () => {
	const groupLabels = {
		columns: labels,
		groups: { input: "Entrées", output: "Sorties", memory: "Mémoires" },
	};

	it("une section par groupe non vide, dans l'ordre entrées / sorties / mémoires", () => {
		const sections = buildProjectVariablesSections(
			[
				new Variable("v1", "M0", "memory", "BOOL"),
				new Variable("v2", "I0", "logic-input", "BOOL"),
				new Variable("v3", "AI0", "analog-input", "INT"),
			],
			groupLabels,
		);
		expect(sections.map((s) => s.title)).toEqual(["Entrées", "Mémoires"]);
		expect(sections[0].table!.rows.map((r) => r[0])).toEqual(["AI0", "I0"]);
	});

	it("omet les variables de bloc et les groupes vides", () => {
		const sections = buildProjectVariablesSections(
			[
				new Variable("v1", "Tempo.Q", "memory", "BOOL", { id: "b1" }),
				new Variable("v2", "O0", "logic-output", "BOOL"),
			],
			groupLabels,
		);
		expect(sections.map((s) => s.title)).toEqual(["Sorties"]);
	});
});
