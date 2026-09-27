import {
	ArithmeticOperator,
	ComparisonOperator,
} from "@/expression-language/operators";
import {
	createArithmeticBlockElement,
	createAssignBlockElement,
	createCompareBlockElement,
	createConvertBlockElement,
	createUserProgramBlockElement,
} from "@/schemas/ladder/block.schema";
import Connection from "@/schemas/ladder/connection.schema";
import {
	CoilType,
	ContactType,
	LadderElement,
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
	getElementHeight,
	getElementWidth,
} from "@/schemas/ladder/element.schema";
import {
	CounterType,
	createCounterBlockElement,
} from "@/schemas/ladder/function-blocks/counter.schema";
import {
	TimerType,
	createTimerBlockElement,
} from "@/schemas/ladder/function-blocks/timer.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";

/**
 * Compact description of a Ladder section: a series of items (contacts, blocks, coils) where
 * `or(...)` opens parallel branches that re-join on the next item (or fan out to several
 * outputs when nothing follows). `section` lays the items out on the grid and wires them from
 * the power rail.
 */
export type LadderItem =
	| { kind: "element"; create: (row: number, col: number) => LadderElement }
	| { kind: "or"; branches: LadderItem[][] };

const element = (
	create: (row: number, col: number) => LadderElement,
): LadderItem => ({ kind: "element", create });

const contact = (type: ContactType) => (variable: string) =>
	element((row, col) => createContactElement(variable, type, row, col));

const coilOfType = (type: CoilType) => (variable: string) =>
	element((row, col) => createCoilElement(variable, type, row, col));

export const no = contact("NO");
export const nf = contact("NF");
export const rising = contact("P");
export const falling = contact("N");

export const coil = coilOfType("normal");
export const invertedCoil = coilOfType("inverted");
export const setCoil = coilOfType("set");
export const resetCoil = coilOfType("reset");
export const risingCoil = coilOfType("rising");
export const fallingCoil = coilOfType("falling");

export const or = (...branches: LadderItem[][]): LadderItem => ({
	kind: "or",
	branches,
});

export const timer = (
	timerType: TimerType,
	name: string,
	pt: string,
	et?: string,
) =>
	element((row, col) =>
		createTimerBlockElement({ name, timerType, pt, et }, row, col),
	);

export const counter = (
	counterType: CounterType,
	name: string,
	params: {
		control: string;
		pv: string;
		cv?: string;
		down?: string;
		load?: string;
		qd?: string;
	},
) =>
	element((row, col) =>
		createCounterBlockElement({ name, counterType, ...params }, row, col),
	);

export const compare = (
	in1: string,
	operator: ComparisonOperator,
	in2: string,
) =>
	element((row, col) =>
		createCompareBlockElement(row, col, { in1, in2, operator }),
	);

export const assign = (out: string, input: string) =>
	element((row, col) =>
		createAssignBlockElement(row, col, { out, in: input }),
	);

export const arithmetic = (
	out: string,
	in1: string,
	operator: ArithmeticOperator,
	in2: string,
) =>
	element((row, col) =>
		createArithmeticBlockElement(row, col, { in1, in2, out, operator }),
	);

export const convert = (out: string, input: string) =>
	element((row, col) => createConvertBlockElement(row, col, { out, in: input }));

export const callProgram = (programId: string) =>
	element((row, col) => createUserProgramBlockElement(programId, row, col));

type Layout = { elements: LadderElement[]; connections: Connection[] };

type Placement = { ends: LadderElement[]; col: number; height: number };

/**
 * Quart-de-colonne/ligne, même résolution que `CELL_SUBDIVISIONS` dans
 * `src/ui/utils/ladder/ladder-connection-path.ts` (source canonique, consommée par l'éditeur
 * interactif) : une colonne `C` a son bord gauche à `4C`, son centre de ligne à `4L+2`.
 */
const QUARTERS_PER_CELL = 4;
const rowCenter = (row: number) => row * QUARTERS_PER_CELL + QUARTERS_PER_CELL / 2;
const colLeftEdge = (col: number) => col * QUARTERS_PER_CELL;

/**
 * `bendCol` place le coude au milieu de la colonne de marge qui précède toujours `to` (le "+1"
 * de `placeSeries`), à distance égale de `to` et de tout élément qui termine une branche voisine
 * plus courte — sans lui, le coude par défaut de l'éditeur (calculé au rendu, sans connaître les
 * éléments intercalés) peut tomber pile sur le bord d'un de ces éléments.
 */
function link(from: LadderElement, to: LadderElement, bendCol: number): Connection {
	const points: [number, number][] =
		from.position.row === to.position.row
			? []
			: [
					[rowCenter(from.position.row), bendCol],
					[rowCenter(to.position.row), bendCol],
				];
	return new Connection(
		createRandomId(),
		{ id: from.id, type: from.type, handle: "source" },
		{ id: to.id, type: to.type, handle: "target" },
		{ points },
	);
}

function placeSeries(
	items: LadderItem[],
	layout: Layout,
	startEnds: LadderElement[],
	row: number,
	startCol: number,
): Placement {
	let ends = startEnds;
	let col = startCol;
	let height = 1;
	for (const item of items) {
		if (item.kind === "element") {
			const placed = item.create(row, col);
			layout.elements.push(placed);
			const bendCol = colLeftEdge(col) - QUARTERS_PER_CELL / 2;
			for (const end of ends) layout.connections.push(link(end, placed, bendCol));
			ends = [placed];
			// +1: empty column so neighbouring mnemonic labels don't overlap.
			col += getElementWidth(placed) + 1;
			height = Math.max(height, getElementHeight(placed));
			continue;
		}
		const nextEnds: LadderElement[] = [];
		let offset = 0;
		let widestCol = col;
		for (const branch of item.branches) {
			if (branch.length === 0) throw new Error("Empty parallel branch");
			const placement = placeSeries(branch, layout, ends, row + offset, col);
			nextEnds.push(...placement.ends);
			offset += placement.height;
			widestCol = Math.max(widestCol, placement.col);
		}
		ends = nextEnds;
		col = widestCol;
		height = Math.max(height, offset);
	}
	return { ends, col, height };
}

/** A titled section holding a single rail-fed series of items. */
export function section(
	title: string,
	description: string,
	...items: LadderItem[]
): Section {
	const rail = createRailTerminalElement(0);
	const layout: Layout = { elements: [rail], connections: [] };
	// Starts at col 1, not 0: keeps the same 1-column gap after the rail as between elements.
	placeSeries(items, layout, [rail], 0, 1);
	return new Section(
		createRandomId(),
		title,
		description,
		layout.elements,
		layout.connections,
	);
}

export function buildLadder(name: string, sections: Section[]): Ladder {
	return new Ladder(createRandomId(), name, sections);
}

/** Replaces the Main's sections with `sections`: the code the student writes lives in the Main. */
export function setMainSections(project: Project, sections: Section[]): void {
	project.main.sections = sections;
}

/**
 * Makes the Main call each program unconditionally, in the given order (one section per call).
 * Programs must already belong to the project.
 */
export function callProgramsFromMain(
	project: Project,
	programs: Ladder[],
): void {
	project.main.sections = programs.map((program) =>
		section(program.name, "", callProgram(program.id)),
	);
}
