import { Dialect } from "@/expression-language/dialect.enum";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import {
	getBlockPortVariableMnemonic,
	getContactMemoryVariableMnemonic,
} from "@/project-analyser/analysers/ladder/ladder.analyser";
import ProjectPreCompilerError from "@/project-pre-compiler/project.pre-compiler.error";
import {
	createArithmeticBlockElement,
	createAssignBlockElement,
	createCompareBlockElement,
	createUserProgramBlockElement,
} from "@/schemas/ladder/block.schema";
import {
	createContactElement,
	createCoilElement,
	createRailTerminalElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import {
	createSectionWith,
	wireInParallel,
	wireInSeries,
} from "@tests/utils/ladder-factory";
import LadderPreCompiler, {
	PreCompiledCoilAssignment,
	PreCompiledEmbeddedNodeAssignment,
	PreCompiledLadder,
} from "./ladder.pre-compiler";

/** Les assignations de bobines, dans l'ordre — helper pour ne pas répéter le filtre partout. */
function coilAssignments(
	result: PreCompiledLadder,
): PreCompiledCoilAssignment[] {
	return result.assignments.filter(
		(a): a is PreCompiledCoilAssignment => a.kind === "coil",
	);
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
		case "NUMBER_LITERAL":
			return String(node.value);
		case "COMPARISON_EXPRESSION":
			return `(${describeNode(node.left)} ${node.operator} ${describeNode(node.right)})`;
		case "ARITHMETIC_EXPRESSION":
			return `(${describeNode(node.left)} ${node.operator} ${describeNode(node.right)})`;
		case "ASSIGN_STATEMENT":
			return `${describeNode(node.left)} := ${describeNode(node.right)}`;
		case "IF_CONTROL":
			return `IF ${describeNode(node.condition)} THEN [${node.trueBranch.map(describeNode).join(", ")}]`;
		default:
			throw new Error(
				`Nœud inattendu dans un ladder pré-compilé : ${node.type}`,
			);
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
		const section = createSectionWith(
			[rail, contact, coil],
			wireInSeries([rail, contact, coil]),
		);
		const ladder = new Ladder("l1", "L", [section]);

		const { result, errors } = preCompile(ladder);

		expect(errors).toEqual([]);
		expect(describeNode(coilAssignments(result)[0].condition)).toBe(
			"(true AND A)",
		);
	});

	it("condition d'un contact NF : NOT de la variable", () => {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "NF", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const section = createSectionWith(
			[rail, contact, coil],
			wireInSeries([rail, contact, coil]),
		);
		const ladder = new Ladder("l1", "L", [section]);

		const { result } = preCompile(ladder);

		expect(describeNode(coilAssignments(result)[0].condition)).toBe(
			"(true AND NOT A)",
		);
	});

	it("condition d'un contact P : variable ET NON mémoire de front", () => {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "P", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const section = createSectionWith(
			[rail, contact, coil],
			wireInSeries([rail, contact, coil]),
		);
		const ladder = new Ladder("l1", "L", [section]);
		const memo = getContactMemoryVariableMnemonic(contact.id);

		const { result } = preCompile(ladder);

		expect(describeNode(coilAssignments(result)[0].condition)).toBe(
			`(true AND (A AND NOT ${memo}))`,
		);
	});

	it("condition d'un contact N : NON variable ET mémoire de front", () => {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "N", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const section = createSectionWith(
			[rail, contact, coil],
			wireInSeries([rail, contact, coil]),
		);
		const ladder = new Ladder("l1", "L", [section]);
		const memo = getContactMemoryVariableMnemonic(contact.id);

		const { result } = preCompile(ladder);

		expect(describeNode(coilAssignments(result)[0].condition)).toBe(
			`(true AND (NOT A AND ${memo}))`,
		);
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

		expect(describeNode(coilAssignments(result)[0].condition)).toBe(
			"((true AND A) AND B)",
		);
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

		expect(describeNode(coilAssignments(result)[0].condition)).toBe(
			"((true AND A) OR (true AND B))",
		);
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

		const ascending = new Ladder("l1", "L", [
			createSectionWith([rail, contactA, contactB, coil], connections),
		]);
		const shuffled = new Ladder("l1", "L", [
			createSectionWith([coil, rail, contactB, contactA], connections),
		]);

		const { result: ascendingResult } = preCompile(ascending);
		const { result: shuffledResult } = preCompile(shuffled);

		expect(describeNode(coilAssignments(shuffledResult)[0].condition)).toBe(
			describeNode(coilAssignments(ascendingResult)[0].condition),
		);
	});

	it("deux sections : coilAssignments concaténé dans l'ordre des sections", () => {
		const rail1 = createRailTerminalElement(0);
		const coil1 = createCoilElement("Q1", "normal", 0, 1);
		const section1 = createSectionWith(
			[rail1, coil1],
			wireInSeries([rail1, coil1]),
		);

		const rail2 = createRailTerminalElement(0);
		const coil2 = createCoilElement("Q2", "normal", 0, 1);
		const section2 = createSectionWith(
			[rail2, coil2],
			wireInSeries([rail2, coil2]),
		);

		const ladder = new Ladder("l1", "L", [section1, section2]);

		const { result } = preCompile(ladder);

		expect(coilAssignments(result).map((a) => a.variable)).toEqual([
			"Q1",
			"Q2",
		]);
	});

	it("ordonne les réseaux d'une section par ligne d'apparition, pas colonne par colonne", () => {
		// Rung du haut (ligne 0) : bobine en colonne 3. Rung du bas (ligne 1) : bobine en colonne 1.
		// Un tri colonne-major placerait Bas avant Haut ; l'ordre attendu suit la ligne.
		const railHaut = createRailTerminalElement(0);
		const contactHaut = createContactElement("A", "NO", 0, 1);
		const contactHaut2 = createContactElement("B", "NO", 0, 2);
		const coilHaut = createCoilElement("QHaut", "normal", 0, 3);
		const railBas = createRailTerminalElement(1);
		const coilBas = createCoilElement("QBas", "normal", 1, 1);
		const section = createSectionWith(
			[railHaut, contactHaut, contactHaut2, coilHaut, railBas, coilBas],
			[
				...wireInSeries([railHaut, contactHaut, contactHaut2, coilHaut]),
				...wireInSeries([railBas, coilBas]),
			],
		);
		const ladder = new Ladder("l1", "L", [section]);

		const { result, errors } = preCompile(ladder);

		expect(errors).toEqual([]);
		expect(coilAssignments(result).map((a) => a.variable)).toEqual([
			"QHaut",
			"QBas",
		]);
	});

	it("un edgeMemoUpdate par contact P/N, aucun pour NO/NF", () => {
		const rail = createRailTerminalElement(0);
		const contactNO = createContactElement("A", "NO", 0, 1);
		const contactNF = createContactElement("B", "NF", 1, 1);
		const contactP = createContactElement("C", "P", 2, 1);
		const contactN = createContactElement("D", "N", 3, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const elements = [rail, contactNO, contactNF, contactP, contactN, coil];
		const section = createSectionWith(
			elements,
			wireInSeries([rail, contactNO, coil]),
		);
		const ladder = new Ladder("l1", "L", [section]);

		const { result } = preCompile(ladder);

		expect(result.edgeMemoUpdates.map((u) => u.contactId).sort()).toEqual(
			[contactN.id, contactP.id].sort(),
		);
	});

	it("collecte une erreur claire (pas un crash) quand une connexion viole l'ordre de colonnes", () => {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "NO", 0, 3);
		const coil = createCoilElement("Q", "normal", 0, 1);
		const section = createSectionWith(
			[rail, contact, coil],
			wireInSeries([rail, contact, coil]),
		);
		const ladder = new Ladder("l1", "L", [section]);

		const { errors } = preCompile(ladder);

		expect(errors).toHaveLength(1);
		expect(errors[0]).toBeInstanceOf(ProjectPreCompilerError);
		expect(errors[0].message).toContain("Ordre de colonnes invalide");
	});

	describe("blocs", () => {
		it("matérialise EN depuis reach, et ENO toujours vrai pour un appel de programme utilisateur", () => {
			const rail = createRailTerminalElement(0);
			const contactA = createContactElement("A", "NO", 0, 1);
			const block = createUserProgramBlockElement("prog1", 0, 2);
			const section = createSectionWith(
				[rail, contactA, block],
				wireInSeries([rail, contactA, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);
			const enMnemonic = getBlockPortVariableMnemonic(block.id, "EN");
			const enoMnemonic = getBlockPortVariableMnemonic(block.id, "ENO");

			const { result } = preCompile(ladder);

			const blockPortAssignments = result.assignments.filter(
				(a) => a.kind === "blockPort",
			);
			expect(blockPortAssignments).toHaveLength(2);
			expect(describeNode((blockPortAssignments[0] as any).value)).toBe(
				"(true AND A)",
			);
			expect(blockPortAssignments[0]).toMatchObject({
				blockId: block.id,
				mnemonic: enMnemonic,
			});
			expect((blockPortAssignments[1] as any).value).toMatchObject({
				type: "BOOLEAN_LITERAL",
				value: true,
			});
			expect(blockPortAssignments[1]).toMatchObject({
				blockId: block.id,
				mnemonic: enoMnemonic,
			});
		});

		it("l'assignation EN précède celle d'une bobine placée après le bloc sur la même ligne", () => {
			const rail = createRailTerminalElement(0);
			const block = createUserProgramBlockElement("prog1", 0, 1);
			const coil = createCoilElement("Q", "normal", 0, 2);
			const section = createSectionWith(
				[rail, block, coil],
				wireInSeries([rail, block, coil]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			expect(result.assignments.map((a) => a.kind)).toEqual([
				"blockPort",
				"blockPort",
				"coil",
			]);
		});

		it("un bloc propage la variable mémoire ENO aux éléments suivants, pas l'expression amont", () => {
			const rail = createRailTerminalElement(0);
			const block = createUserProgramBlockElement("prog1", 0, 1);
			const coil = createCoilElement("Q", "normal", 0, 2);
			const section = createSectionWith(
				[rail, block, coil],
				wireInSeries([rail, block, coil]),
			);
			const ladder = new Ladder("l1", "L", [section]);
			const enoMnemonic = getBlockPortVariableMnemonic(block.id, "ENO");

			const { result } = preCompile(ladder);

			const coilAssignment = coilAssignments(result)[0];
			expect(describeNode(coilAssignment.condition)).toBe(enoMnemonic);
		});

		it("génère un appel de bloc référençant le programId et le mnémonique EN", () => {
			const rail = createRailTerminalElement(0);
			const block = createUserProgramBlockElement("prog1", 0, 1);
			const section = createSectionWith(
				[rail, block],
				wireInSeries([rail, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			expect(result.blockCalls).toEqual([
				{
					blockId: block.id,
					programId: "prog1",
					enMnemonic: getBlockPortVariableMnemonic(block.id, "EN"),
				},
			]);
		});
	});

	describe("blocs timer", () => {
		function timerAssignment(result: PreCompiledLadder): {
			node: TimerNode;
		} {
			const found = result.assignments.find(
				(a): a is PreCompiledEmbeddedNodeAssignment =>
					a.kind === "embeddedNode" && a.simRole === "timer",
			);
			if (!found) throw new Error("Aucun TimerNode trouvé");
			return { node: found.node as TimerNode };
		}

		it("matérialise IN depuis reach et un TimerNode référençant les variables générées", () => {
			const rail = createRailTerminalElement(0);
			const contactA = createContactElement("A", "NO", 0, 1);
			const block = createTimerBlockElement(
				{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
				0,
				2,
			);
			const section = createSectionWith(
				[rail, contactA, block],
				wireInSeries([rail, contactA, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			const inAssignment = result.assignments.find(
				(a) => a.kind === "blockPort" && a.mnemonic === "Tempo1.IN",
			) as any;
			expect(describeNode(inAssignment.value)).toBe("(true AND A)");

			const timer = timerAssignment(result);
			expect(timer.node.timerType).toBe("TON");
			expect(describeNode(timer.node.input as ASTNode)).toBe("Tempo1.IN");
			expect(describeNode(timer.node.elapsedTime as ASTNode)).toBe("Tempo1.ET");
			expect(describeNode(timer.node.output as ASTNode)).toBe("Tempo1.Q");
			expect(timer.node.presetTime).toMatchObject({
				type: "NUMBER_LITERAL",
				value: 5000,
			});
		});

		it("résout PT comme identifiant quand ce n'est pas une constante T#", () => {
			const rail = createRailTerminalElement(0);
			const block = createTimerBlockElement(
				{ name: "Tempo1", timerType: "TOF", pt: "MaConsigne" },
				0,
				1,
			);
			const section = createSectionWith(
				[rail, block],
				wireInSeries([rail, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			expect(
				describeNode(timerAssignment(result).node.presetTime as ASTNode),
			).toBe("MaConsigne");
		});

		it("recopie ET vers la variable du pin ET quand elle est renseignée, après le TimerNode", () => {
			const rail = createRailTerminalElement(0);
			const block = createTimerBlockElement(
				{ name: "Tempo1", timerType: "TP", pt: "T#1s", et: "SortieET" },
				0,
				1,
			);
			const section = createSectionWith(
				[rail, block],
				wireInSeries([rail, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			expect(result.assignments.map((a) => a.kind)).toEqual([
				"blockPort",
				"embeddedNode",
				"blockPort",
			]);
			const etCopy = result.assignments[2] as any;
			expect(etCopy.mnemonic).toBe("SortieET");
			expect(describeNode(etCopy.value)).toBe("Tempo1.ET");
		});

		it("ne recopie pas ET quand le pin est vide", () => {
			const rail = createRailTerminalElement(0);
			const block = createTimerBlockElement(
				{ name: "Tempo1", timerType: "TON", pt: "T#1s" },
				0,
				1,
			);
			const section = createSectionWith(
				[rail, block],
				wireInSeries([rail, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			expect(result.assignments.map((a) => a.kind)).toEqual([
				"blockPort",
				"embeddedNode",
			]);
		});

		it("propage Q aux éléments suivants sur la même ligne", () => {
			const rail = createRailTerminalElement(0);
			const block = createTimerBlockElement(
				{ name: "Tempo1", timerType: "TON", pt: "T#1s" },
				0,
				1,
			);
			const coil = createCoilElement("Q", "normal", 0, 2);
			const section = createSectionWith(
				[rail, block, coil],
				wireInSeries([rail, block, coil]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			const coilAssignment = coilAssignments(result)[0];
			expect(describeNode(coilAssignment.condition)).toBe("Tempo1.Q");
		});

		it("expose les TimerNode générés dans `timers`", () => {
			const rail = createRailTerminalElement(0);
			const block = createTimerBlockElement(
				{ name: "Tempo1", timerType: "TON", pt: "T#1s" },
				0,
				1,
			);
			const section = createSectionWith(
				[rail, block],
				wireInSeries([rail, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			expect(result.timers).toHaveLength(1);
			expect(result.timers[0].type).toBe("TIMER_BLOCK");
		});
	});

	describe("blocs compare", () => {
		it("matérialise IN depuis reach, et Q = IN ET l'expression", () => {
			const rail = createRailTerminalElement(0);
			const contactA = createContactElement("A", "NO", 0, 1);
			const block = createCompareBlockElement(0, 2, { in1: "X", in2: "Y", operator: ">" });
			const section = createSectionWith(
				[rail, contactA, block],
				wireInSeries([rail, contactA, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			const inMnemonic = getBlockPortVariableMnemonic(block.id, "IN");
			const qMnemonic = getBlockPortVariableMnemonic(block.id, "Q");

			const blockPortAssignments = result.assignments.filter(
				(a) => a.kind === "blockPort",
			) as any[];
			expect(blockPortAssignments).toHaveLength(2);

			const inAssignment = blockPortAssignments.find(
				(a) => a.mnemonic === inMnemonic,
			)!;
			expect(describeNode(inAssignment.value)).toBe("(true AND A)");

			const qAssignment = blockPortAssignments.find(
				(a) => a.mnemonic === qMnemonic,
			)!;
			expect(describeNode(qAssignment.value)).toBe(
				`(${inMnemonic} AND (X > Y))`,
			);
		});

		it("propage Q aux éléments suivants sur la même ligne", () => {
			const rail = createRailTerminalElement(0);
			const block = createCompareBlockElement(0, 1, { in1: "X", in2: "Y", operator: ">" });
			const coil = createCoilElement("Q", "normal", 0, 2);
			const section = createSectionWith(
				[rail, block, coil],
				wireInSeries([rail, block, coil]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			const qMnemonic = getBlockPortVariableMnemonic(block.id, "Q");
			const coilAssignment = coilAssignments(result)[0];
			expect(describeNode(coilAssignment.condition)).toBe(qMnemonic);
		});

		it("ne produit ni TimerNode ni CounterNode", () => {
			const rail = createRailTerminalElement(0);
			const block = createCompareBlockElement(0, 1, { in1: "X", in2: "Y", operator: ">" });
			const section = createSectionWith(
				[rail, block],
				wireInSeries([rail, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			expect(result.timers).toEqual([]);
			expect(result.counters).toEqual([]);
			expect(result.assignments.every((a) => a.kind === "blockPort")).toBe(
				true,
			);
		});
	});

	describe("blocs assign", () => {
		it("matérialise EN depuis reach, et un IfControlNode qui exécute l'affectation quand EN est vrai", () => {
			const rail = createRailTerminalElement(0);
			const contactA = createContactElement("A", "NO", 0, 1);
			const block = createAssignBlockElement(0, 2, { out: "X", in: "Y" });
			const section = createSectionWith(
				[rail, contactA, block],
				wireInSeries([rail, contactA, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			const enMnemonic = getBlockPortVariableMnemonic(block.id, "EN");
			const enoMnemonic = getBlockPortVariableMnemonic(block.id, "ENO");

			const blockPortAssignments = result.assignments.filter(
				(a) => a.kind === "blockPort",
			) as any[];
			expect(blockPortAssignments).toHaveLength(2);

			const enAssignment = blockPortAssignments.find(
				(a) => a.mnemonic === enMnemonic,
			)!;
			expect(describeNode(enAssignment.value)).toBe("(true AND A)");

			const enoAssignment = blockPortAssignments.find(
				(a) => a.mnemonic === enoMnemonic,
			)!;
			expect(describeNode(enoAssignment.value)).toBe("true");

			const assignAssignment = result.assignments.find(
				(a) => a.kind === "embeddedNode",
			) as any;
			expect(describeNode(assignAssignment.node)).toBe(
				`IF ${enMnemonic} THEN [X := Y]`,
			);
		});

		it("propage ENO (toujours vrai) aux éléments suivants sur la même ligne", () => {
			const rail = createRailTerminalElement(0);
			const block = createAssignBlockElement(0, 1, { out: "X", in: "Y" });
			const coil = createCoilElement("Q", "normal", 0, 2);
			const section = createSectionWith(
				[rail, block, coil],
				wireInSeries([rail, block, coil]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			const enoMnemonic = getBlockPortVariableMnemonic(block.id, "ENO");
			const coilAssignment = coilAssignments(result)[0];
			expect(describeNode(coilAssignment.condition)).toBe(enoMnemonic);
		});

		it("ne produit ni TimerNode ni CounterNode", () => {
			const rail = createRailTerminalElement(0);
			const block = createAssignBlockElement(0, 1, { out: "X", in: "Y" });
			const section = createSectionWith(
				[rail, block],
				wireInSeries([rail, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			expect(result.timers).toEqual([]);
			expect(result.counters).toEqual([]);
		});
	});

	describe("blocs arithmetic", () => {
		it("matérialise EN depuis reach, et un IfControlNode qui affecte out := in1 op in2", () => {
			const rail = createRailTerminalElement(0);
			const contactA = createContactElement("A", "NO", 0, 1);
			const block = createArithmeticBlockElement(0, 2, {
				in1: "X",
				in2: "Y",
				out: "Z",
				operator: "+",
			});
			const section = createSectionWith(
				[rail, contactA, block],
				wireInSeries([rail, contactA, block]),
			);
			const ladder = new Ladder("l1", "L", [section]);

			const { result } = preCompile(ladder);

			const enMnemonic = getBlockPortVariableMnemonic(block.id, "EN");
			const enAssignment = (
				result.assignments.filter((a) => a.kind === "blockPort") as any[]
			).find((a) => a.mnemonic === enMnemonic)!;
			expect(describeNode(enAssignment.value)).toBe("(true AND A)");

			const assignAssignment = result.assignments.find(
				(a) => a.kind === "embeddedNode",
			) as any;
			expect(describeNode(assignAssignment.node)).toBe(
				`IF ${enMnemonic} THEN [Z := (X + Y)]`,
			);
		});
	});
});
