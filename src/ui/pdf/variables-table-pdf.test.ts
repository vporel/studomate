import { Dialect } from "@/expression-language/dialect.enum";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
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
	declaredValue: "Valeur déclarée",
	comment: "Commentaire",
};

describe("buildVariablesTableModel", () => {
	it("trie les variables par mnémonique et remplit les colonnes", () => {
		const model = buildVariablesTableModel(
			[
				new Variable({
					id: "v2",
					mnemonic: "ZEBRE",
					zone: "memory",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
				new Variable({
					id: "v1",
					mnemonic: "ALPHA",
					zone: "memory",
					type: "INT",
					dialect: Dialect.FR,
				}),
			],
			labels,
			"address",
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
		const withData = new Variable({
			id: "v1",
			mnemonic: "M0",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});
		withData.address = "%M0";
		withData.comment = "un commentaire";
		const bare = new Variable({
			id: "v2",
			mnemonic: "M1",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});

		const model = buildVariablesTableModel([withData, bare], labels, "address");
		expect(model.rows[0]).toEqual(["M0", "BOOL", "%M0", "un commentaire"]);
		expect(model.rows[1]).toEqual(["M1", "BOOL", "", ""]);
	});
});

describe("buildVariablesTableSection", () => {
	it("produit une section paysage portant un tableau", () => {
		const section = buildVariablesTableSection("Titre", [], labels, "address");
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
				new Variable({
					id: "v1",
					mnemonic: "I0",
					zone: "logic-input",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
				new Variable({
					id: "v2",
					mnemonic: "AI0",
					zone: "analog-input",
					type: "INT",
					dialect: Dialect.FR,
				}),
				new Variable({
					id: "v3",
					mnemonic: "M0",
					zone: "memory",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
				new Variable({
					id: "v4",
					mnemonic: "T.Q",
					zone: "logic-input",
					type: "BOOL",
					ownerBlock: { id: "b1" },
					dialect: Dialect.FR,
				}),
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
		groups: {
			input: "Entrées",
			output: "Sorties",
			memory: "Mémoires",
			constant: "Constantes",
		},
	};

	it("une section par groupe non vide, dans l'ordre entrées / sorties / mémoires", () => {
		const sections = buildProjectVariablesSections(
			[
				new Variable({
					id: "v1",
					mnemonic: "M0",
					zone: "memory",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
				new Variable({
					id: "v2",
					mnemonic: "I0",
					zone: "logic-input",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
				new Variable({
					id: "v3",
					mnemonic: "AI0",
					zone: "analog-input",
					type: "INT",
					dialect: Dialect.FR,
				}),
			],
			groupLabels,
		);
		expect(sections.map((s) => s.title)).toEqual(["Entrées", "Mémoires"]);
		expect(sections[0].table!.rows.map((r) => r[0])).toEqual(["AI0", "I0"]);
	});

	it("omet les variables de bloc et les groupes vides", () => {
		const sections = buildProjectVariablesSections(
			[
				new Variable({
					id: "v1",
					mnemonic: "Tempo.Q",
					zone: "memory",
					type: "BOOL",
					ownerBlock: { id: "b1" },
					dialect: Dialect.FR,
				}),
				new Variable({
					id: "v2",
					mnemonic: "O0",
					zone: "logic-output",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
			],
			groupLabels,
		);
		expect(sections.map((s) => s.title)).toEqual(["Sorties"]);
	});
});

describe("constants in the PDF export", () => {
	const groupLabels = {
		columns: labels,
		groups: {
			input: "Entrées",
			output: "Sorties",
			memory: "Mémoires",
			constant: "Constantes",
		},
	};
	const constants = [
		new Variable({
			id: "c2",
			mnemonic: "SEUIL",
			zone: "constant",
			type: "INT",
			value: "42",
			dialect: Dialect.FR,
		}),
		new Variable({
			id: "c1",
			mnemonic: "DELAI",
			zone: "constant",
			type: "TIME",
			value: "T#5s",
			dialect: Dialect.FR,
		}),
	];

	it("adds a Constantes section after the memories, with the declared value and no address column", () => {
		const sections = buildProjectVariablesSections(
			[
				new Variable({
					id: "v1",
					mnemonic: "M0",
					zone: "memory",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
				...constants,
			],
			groupLabels,
		);

		expect(sections.map((s) => s.title)).toEqual(["Mémoires", "Constantes"]);
		const table = sections[1].table!;
		expect(table.columns.map((c) => c.header)).toEqual([
			"Mnémonique",
			"Type",
			"Valeur déclarée",
			"Commentaire",
		]);
		expect(table.rows).toEqual([
			["DELAI", "TIME", "T#5s", ""],
			["SEUIL", "INT", "42", ""],
		]);
	});

	it("keeps the address column for the other groups", () => {
		const model = buildVariablesTableModel(
			[
				new Variable({
					id: "v1",
					mnemonic: "M0",
					zone: "memory",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
			],
			labels,
			"address",
		);

		expect(model.columns.map((c) => c.header)).toContain("Adresse");
		expect(model.columns.map((c) => c.header)).not.toContain("Valeur déclarée");
	});

	it("the active page export of the constants page builds the same table", () => {
		const section = buildVariableGroupSection(
			"constant",
			[
				...constants,
				new Variable({
					id: "v1",
					mnemonic: "M0",
					zone: "memory",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
			],
			"Constantes",
			labels,
		);

		expect(section.table!.rows.map((r) => r[0])).toEqual(["DELAI", "SEUIL"]);
	});
});

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
