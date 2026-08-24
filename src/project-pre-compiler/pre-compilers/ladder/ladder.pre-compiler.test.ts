import { Dialect } from "@/expression-language/dialect.enum";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { getBlockPortVariableMnemonic, getContactMemoryVariableMnemonic } from "@/project-analyser/analysers/ladder/ladder.analyser";
import ProjectPreCompilerError from "@/project-pre-compiler/project.pre-compiler.error";
import { createUserProgramBlockElement } from "@/schemas/ladder/block.schema";
import { createContactElement, createCoilElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { createSectionWith, wireInParallel, wireInSeries } from "@tests/utils/ladder-factory";
import LadderPreCompiler, { PreCompiledCoilAssignment, PreCompiledLadder } from "./ladder.pre-compiler";

/** Les assignations de bobines, dans l'ordre — helper pour ne pas répéter le filtre partout. */
function coilAssignments(result: PreCompiledLadder): PreCompiledCoilAssignment[] {
	return result.assignments.filter((a): a is PreCompiledCoilAssignment => a.kind === "coil");
}

/** Rend une AST lisible pour les assertions, sans dépendre des `id` (aléatoires) des nœuds. */
function describeNode(node: ASTNode): string {
	switch (node.type) {
		case "IDENTIFIER":
			return node.value;
		case "BOOLEAN_LITERAL":
			return String(node.value);
		case "UNARY_EXPRESSION":
			return `${node.operator} ${describeNode(node.expr)}`;
		case "LOGICAL_EXPRESSION":
			return `(${describeNode(node.left)} ${node.operator} ${describeNode(node.right)})`;
		default:
			throw new Error(`Nœud inattendu dans un ladder pré-compilé : ${node.type}`);
	}
}

describe("LadderPreCompiler", () => {
	function preCompile(ladder: Ladder) {
		const errors: ProjectPreCompilerError[] = [];
		const result = LadderPreCompiler.preCompile(ladder, [], Dialect.FR, errors);
		return { result, errors };
	}

	it("condition d'un contact NO seul : l'identifiant de la variable", () => {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "NO", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const section = createSectionWith([rail, contact, coil], wireInSeries([rail, contact, coil]));
		const ladder = new Ladder("l1", "L", [section]);

		const { result, errors } = preCompile(ladder);

		expect(errors).toEqual([]);
		expect(describeNode(coilAssignments(result)[0].condition)).toBe("(true AND A)");
	});

	it("condition d'un contact NF : NOT de la variable", () => {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "NF", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const section = createSectionWith([rail, contact, coil], wireInSeries([rail, contact, coil]));
		const ladder = new Ladder("l1", "L", [section]);

		const { result } = preCompile(ladder);

		expect(describeNode(coilAssignments(result)[0].condition)).toBe("(true AND NOT A)");
	});

	it("condition d'un contact P : variable ET NON mémoire de front", () => {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "P", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const section = createSectionWith([rail, contact, coil], wireInSeries([rail, contact, coil]));
		const ladder = new Ladder("l1", "L", [section]);
		const memo = getContactMemoryVariableMnemonic(contact.id);

		const { result } = preCompile(ladder);

		expect(describeNode(coilAssignments(result)[0].condition)).toBe(`(true AND (A AND NOT ${memo}))`);
	});

	it("condition d'un contact N : NON variable ET mémoire de front", () => {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "N", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const section = createSectionWith([rail, contact, coil], wireInSeries([rail, contact, coil]));
		const ladder = new Ladder("l1", "L", [section]);
		const memo = getContactMemoryVariableMnemonic(contact.id);

		const { result } = preCompile(ladder);

		expect(describeNode(coilAssignments(result)[0].condition)).toBe(`(true AND (NOT A AND ${memo}))`);
	});

	it("deux contacts en série : ET des deux conditions, borne d'alimentation toujours vraie", () => {
		const rail = createRailTerminalElement(0);
		const contactA = createContactElement("A", "NO", 0, 1);
		const contactB = createContactElement("B", "NO", 0, 2);
		const coil = createCoilElement("Q", "normal", 0, 3);
		const section = createSectionWith(
			[rail, contactA, contactB, coil],
			wireInSeries([rail, contactA, contactB, coil]),
		);
		const ladder = new Ladder("l1", "L", [section]);

		const { result } = preCompile(ladder);

		expect(describeNode(coilAssignments(result)[0].condition)).toBe("((true AND A) AND B)");
	});

	it("deux branches parallèles convergeant sur une bobine : OU dans l'ordre des connexions entrantes", () => {
		const rail = createRailTerminalElement(0);
		const contactA = createContactElement("A", "NO", 0, 1);
		const contactB = createContactElement("B", "NO", 1, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const section = createSectionWith(
			[rail, contactA, contactB, coil],
			wireInParallel(rail, [contactA, contactB], coil),
		);
		const ladder = new Ladder("l1", "L", [section]);

		const { result } = preCompile(ladder);

		expect(describeNode(coilAssignments(result)[0].condition)).toBe("((true AND A) OR (true AND B))");
	});

	it("bobine sans prédécesseur : condition repliée sur true", () => {
		const coil = createCoilElement("Q", "normal", 0, 0);
		const section = createSectionWith([coil]);
		const ladder = new Ladder("l1", "L", [section]);

		const { result } = preCompile(ladder);

		expect(coilAssignments(result)[0].condition).toEqual({
			id: expect.any(String),
			type: "BOOLEAN_LITERAL",
			value: true,
			position: undefined,
		});
	});

	it("l'ordre des éléments dans section.elements n'affecte pas la condition calculée (tri par colonne)", () => {
		const rail = createRailTerminalElement(0);
		const contactA = createContactElement("A", "NO", 0, 1);
		const contactB = createContactElement("B", "NO", 0, 2);
		const coil = createCoilElement("Q", "normal", 0, 3);
		const connections = wireInSeries([rail, contactA, contactB, coil]);

		const ascending = new Ladder("l1", "L", [createSectionWith([rail, contactA, contactB, coil], connections)]);
		const shuffled = new Ladder("l1", "L", [createSectionWith([coil, rail, contactB, contactA], connections)]);

		const { result: ascendingResult } = preCompile(ascending);
		const { result: shuffledResult } = preCompile(shuffled);

		expect(describeNode(coilAssignments(shuffledResult)[0].condition)).toBe(
			describeNode(coilAssignments(ascendingResult)[0].condition),
		);
	});

	it("deux sections : coilAssignments concaténé dans l'ordre des sections", () => {
		const rail1 = createRailTerminalElement(0);
		const coil1 = createCoilElement("Q1", "normal", 0, 1);
		const section1 = createSectionWith([rail1, coil1], wireInSeries([rail1, coil1]));

		const rail2 = createRailTerminalElement(0);
		const coil2 = createCoilElement("Q2", "normal", 0, 1);
		const section2 = createSectionWith([rail2, coil2], wireInSeries([rail2, coil2]));

		const ladder = new Ladder("l1", "L", [section1, section2]);

		const { result } = preCompile(ladder);

		expect(coilAssignments(result).map((a) => a.variable)).toEqual(["Q1", "Q2"]);
	});

	it("un edgeMemoUpdate par contact P/N, aucun pour NO/NF", () => {
		const rail = createRailTerminalElement(0);
		const contactNO = createContactElement("A", "NO", 0, 1);
		const contactNF = createContactElement("B", "NF", 1, 1);
		const contactP = createContactElement("C", "P", 2, 1);
		const contactN = createContactElement("D", "N", 3, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const elements = [rail, contactNO, contactNF, contactP, contactN, coil];
		const section = createSectionWith(elements, wireInSeries([rail, contactNO, coil]));
		const ladder = new Ladder("l1", "L", [section]);

		const { result } = preCompile(ladder);

		expect(result.edgeMemoUpdates.map((u) => u.contactId).sort()).toEqual([contactN.id, contactP.id].sort());
	});

	describe("blocs", () => {
		it("matérialise EN depuis reach, et ENO toujours vrai pour un appel de programme utilisateur", () => {
			const rail = createRailTerminalElement(0);
			const contactA = createContactElement("A", "NO", 0, 1);
			const block = createUserProgramBlockElement("prog1", 0, 2);
			const section = createSectionWith([rail, contactA, block], wireInSeries([rail, contactA, block]));
			const ladder = new Ladder("l1", "L", [section]);
			const enMnemonic = getBlockPortVariableMnemonic(block.id, "EN");
			const enoMnemonic = getBlockPortVariableMnemonic(block.id, "ENO");

			const { result } = preCompile(ladder);

			const blockPortAssignments = result.assignments.filter((a) => a.kind === "blockPort");
			expect(blockPortAssignments).toHaveLength(2);
			expect(describeNode((blockPortAssignments[0] as any).value)).toBe("(true AND A)");
			expect(blockPortAssignments[0]).toMatchObject({ blockId: block.id, mnemonic: enMnemonic });
			expect((blockPortAssignments[1] as any).value).toMatchObject({ type: "BOOLEAN_LITERAL", value: true });
			expect(blockPortAssignments[1]).toMatchObject({ blockId: block.id, mnemonic: enoMnemonic });
		});

		it("l'assignation EN précède celle d'une bobine placée après le bloc sur la même ligne", () => {
			const rail = createRailTerminalElement(0);
			const block = createUserProgramBlockElement("prog1", 0, 1);
			const coil = createCoilElement("Q", "normal", 0, 2);
			const section = createSectionWith([rail, block, coil], wireInSeries([rail, block, coil]));
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			expect(result.assignments.map((a) => a.kind)).toEqual(["blockPort", "blockPort", "coil"]);
		});

		it("un bloc propage la variable mémoire ENO aux éléments suivants, pas l'expression amont", () => {
			const rail = createRailTerminalElement(0);
			const block = createUserProgramBlockElement("prog1", 0, 1);
			const coil = createCoilElement("Q", "normal", 0, 2);
			const section = createSectionWith([rail, block, coil], wireInSeries([rail, block, coil]));
			const ladder = new Ladder("l1", "L", [section]);
			const enoMnemonic = getBlockPortVariableMnemonic(block.id, "ENO");

			const { result } = preCompile(ladder);

			const coilAssignment = coilAssignments(result)[0];
			expect(describeNode(coilAssignment.condition)).toBe(enoMnemonic);
		});

		it("génère un appel de bloc référençant le programId et le mnémonique EN", () => {
			const rail = createRailTerminalElement(0);
			const block = createUserProgramBlockElement("prog1", 0, 1);
			const section = createSectionWith([rail, block], wireInSeries([rail, block]));
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			expect(result.blockCalls).toEqual([
				{ blockId: block.id, programId: "prog1", enMnemonic: getBlockPortVariableMnemonic(block.id, "EN") },
			]);
		});
	});
});
