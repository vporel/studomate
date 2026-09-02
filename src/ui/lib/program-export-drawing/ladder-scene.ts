import {
	BLOCK_DEFINITIONS,
	resolvePortSpecs,
	resolveStructuralPorts,
} from "@/schemas/ladder/block-definition";
import { BlockData } from "@/schemas/ladder/block.schema";
import {
	getBlockHeightInCellUnits,
	getParameterPinRows,
} from "@/schemas/ladder/block-port.schema";
import {
	getElementWidth,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import {
	colToX,
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
	getConnectionLinePoints,
	LADDER_FLOW_TOP_OFFSET,
	POWER_RAIL_OFFSET,
	RAIL_LANE_WIDTH,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { CELL_SUBDIVISIONS } from "@/ui/utils/ladder/ladder-connection-path";
import { DrawOp, Scene } from "./draw-op";
import { LadderRenderContext } from "./ladder-render-context";
import { frameScene } from "./scene-geometry";

const MARGIN = 16;
/** Facteur de grossissement cible du ladder vs. « tenir une section dans la largeur de page » :
 * l'exporter plafonne l'échelle commune des sections à ce grossissement. */
export const LADDER_ZOOM = 1.2;
const STROKE = 2;
const CONNECTION_STROKE = 2;
const VAR_SIZE = 9;
const PIN_SIZE = 8;

const FALLBACK_STATIC_LABEL: Record<string, string> = {
	assign: "Assign",
	arithmetic: "Calc",
};

/** Hauteur d'une ligne de grille dans le rendu SVG. */
const CELL_HEIGHT = GRID_CELL_HEIGHT;

const rowToY = (row: number): number =>
	LADDER_FLOW_TOP_OFFSET + row * CELL_HEIGHT;

const cellCenterY = (row: number): number => rowToY(row) + CELL_HEIGHT / 2;

/** Ordonnée de câblage d'un élément sur son rung — centre de la première cellule pour tous
 * (contacts, bobines, blocs). */
function wiringY(element: LadderElement): number {
	return cellCenterY(element.position.row);
}

function elementLeftX(element: LadderElement): number {
	return element.type === "railTerminal" ? 0 : colToX(element.position.col);
}

function elementRightX(element: LadderElement): number {
	if (element.type === "railTerminal") return RAIL_LANE_WIDTH;
	return colToX(element.position.col) + getElementWidth(element) * GRID_CELL_WIDTH;
}

function handlePoint(element: LadderElement, handle: string): [number, number] {
	const isLeft = handle === "target" || handle.endsWith(":in");
	return [isLeft ? elementLeftX(element) : elementRightX(element), wiringY(element)];
}

/**
 * Sommets (px) du tracé d'une connexion ladder. `data.points` est en `[ligne, quartCol]` (voir
 * `LadderConnectionEdge.buildVertices`) : seule la colonne compte, l'ordonnée vient toujours de
 * la source / de la cible.
 */
export function connectionVertices(
	s: [number, number],
	t: [number, number],
	stored: [number, number][] | undefined,
): [number, number][] {
	if (s[1] === t[1]) return [s, t]; // même ligne : rung horizontal
	if (!stored || stored.length === 0) {
		return getConnectionLinePoints(s[0], s[1], t[0], t[1]);
	}
	const quarterCellWidth = GRID_CELL_WIDTH / CELL_SUBDIVISIONS;
	const bend = stored.map(
		([, quarterCol], i): [number, number] => [
			POWER_RAIL_OFFSET + quarterCol * quarterCellWidth,
			i === 0 ? s[1] : t[1],
		],
	);
	return [s, ...bend, t];
}

// --- symboles ------------------------------------------------------------

function contactOps(element: LadderElement & { type: "contact" }): DrawOp[] {
	const x = colToX(element.position.col);
	const y = rowToY(element.position.row);
	const cy = y + CELL_HEIGHT / 2;
	const w = GRID_CELL_WIDTH;
	const barL = x + w * 0.3;
	const barR = x + w * 0.7;
	const ops: DrawOp[] = [
		{ op: "line", x1: x, y1: cy, x2: barL, y2: cy, strokeWidth: STROKE },
		{ op: "line", x1: barL, y1: y + 11, x2: barL, y2: y + CELL_HEIGHT - 6, strokeWidth: STROKE },
		{ op: "line", x1: barR, y1: y + 11, x2: barR, y2: y + CELL_HEIGHT - 6, strokeWidth: STROKE },
		{ op: "line", x1: barR, y1: cy, x2: x + w, y2: cy, strokeWidth: STROKE },
	];
	if (element.data.type === "NF") {
		ops.push({
			op: "line",
			x1: barL + 2,
			y1: y + CELL_HEIGHT - 8,
			x2: barR - 2,
			y2: y + 13,
			strokeWidth: STROKE,
		});
	}
	if (element.data.type === "P" || element.data.type === "N") {
		ops.push({
			op: "text",
			x: (barL + barR) / 2,
			y: cy,
			text: element.data.type,
			fontSize: 10,
			align: "center",
			baseline: "middle",
		});
	}
	if (element.data.variable) {
		ops.push(varLabel(x + w / 2, y + 5, element.data.variable));
	}
	return ops;
}

function coilOps(element: LadderElement & { type: "coil" }): DrawOp[] {
	const x = colToX(element.position.col);
	const y = rowToY(element.position.row);
	const cy = y + CELL_HEIGHT / 2;
	const w = GRID_CELL_WIDTH;
	const bx1 = x + w * 0.28;
	const bx2 = x + w * 0.72;
	const top = y + 11;
	const bot = y + CELL_HEIGHT - 6;
	const bulge = w * 0.14;
	const ops: DrawOp[] = [
		{ op: "line", x1: x, y1: cy, x2: bx1, y2: cy, strokeWidth: STROKE },
		{
			op: "path",
			d: `M ${bx1} ${top} C ${bx1 - bulge} ${top + (bot - top) * 0.3} ${bx1 - bulge} ${bot - (bot - top) * 0.3} ${bx1} ${bot}`,
			strokeWidth: STROKE,
		},
		{
			op: "path",
			d: `M ${bx2} ${top} C ${bx2 + bulge} ${top + (bot - top) * 0.3} ${bx2 + bulge} ${bot - (bot - top) * 0.3} ${bx2} ${bot}`,
			strokeWidth: STROKE,
		},
		{ op: "line", x1: bx2, y1: cy, x2: x + w, y2: cy, strokeWidth: STROKE },
	];
	const letter =
		element.data.type === "set" ? "S" : element.data.type === "reset" ? "R" : "";
	if (letter) {
		ops.push({
			op: "text",
			x: x + w / 2,
			y: cy,
			text: letter,
			fontSize: 10,
			align: "center",
			baseline: "middle",
			bold: true,
		});
	}
	if (element.data.variable) {
		ops.push(varLabel(x + w / 2, y + 5, element.data.variable));
	}
	return ops;
}

function varLabel(x: number, y: number, text: string): DrawOp {
	return {
		op: "text",
		x,
		y,
		text,
		fontSize: VAR_SIZE,
		align: "center",
		baseline: "alphabetic",
	};
}

function operatorSymbol(op: string): string {
	return op === "<>" ? "!=" : op;
}

function compareBlockOps(
	element: LadderElement & { type: "block" },
	params: { in1: string; in2: string; operator: string },
): DrawOp[] {
	const x = colToX(element.position.col);
	const y = rowToY(element.position.row);
	const cy = y + CELL_HEIGHT / 2;
	const w = GRID_CELL_WIDTH;
	const boxW = w * 0.7;
	const boxH = CELL_HEIGHT * 0.42;
	const boxX = x + (w - boxW) / 2;
	const boxY = cy - boxH / 2;
	return [
		{ op: "line", x1: x, y1: cy, x2: boxX, y2: cy, strokeWidth: STROKE },
		{ op: "line", x1: boxX + boxW, y1: cy, x2: x + w, y2: cy, strokeWidth: STROKE },
		{ op: "rect", x: boxX, y: boxY, w: boxW, h: boxH, rx: 2, fill: "#ffffff", strokeWidth: 1.5 },
		{
			op: "text",
			x: x + w / 2,
			y: cy,
			text: operatorSymbol(params.operator),
			fontSize: 11,
			align: "center",
			baseline: "middle",
			bold: true,
		},
		{ op: "text", x: x + w / 2, y: y + 9, text: params.in1, fontSize: VAR_SIZE, align: "center", baseline: "alphabetic" },
		{
			op: "text",
			x: x + w / 2,
			y: y + CELL_HEIGHT - 5,
			text: params.in2,
			fontSize: VAR_SIZE,
			align: "center",
			baseline: "alphabetic",
		},
	];
}

/** Espacement vertical d'une ligne de pins paramètres (demi-cellule, cf. l'éditeur). */
const PARAM_ROW_STEP = CELL_HEIGHT / 2;

function boxBlockOps(
	element: LadderElement & { type: "block" },
	context: LadderRenderContext,
): DrawOp[] {
	const data = element.data;
	const def = BLOCK_DEFINITIONS[data.blockType];
	const specs = resolvePortSpecs(data);
	const structural = resolveStructuralPorts(data);
	const x = colToX(element.position.col);
	const y = rowToY(element.position.row);
	const w = getElementWidth(element) * GRID_CELL_WIDTH;
	// Hauteur de rendu identique à l'éditeur (`getBlockHeightInCellUnits`).
	const h = getBlockHeightInCellUnits(specs) * CELL_HEIGHT;
	// Ligne structurelle sur le centre de la 1re cellule : le rung d'un bloc est à la même
	// hauteur qu'un contact/une bobine, pas de coude parasite au raccord.
	const structRowY = y + CELL_HEIGHT / 2;
	const boxTop = y + 8;
	const boxBottom = y + h;

	const label =
		data.blockType === "user-program"
			? context.programName?.(
					(data.params as { programId: string }).programId,
				) ?? "Programme"
			: data.blockType === "timer" || data.blockType === "counter"
				? (data.params as { name?: string }).name || data.blockType
				: context.blockStaticLabel?.(data.blockType) ??
					FALLBACK_STATIC_LABEL[data.blockType] ??
					data.blockType;

	const ops: DrawOp[] = [
		{ op: "rect", x, y: boxTop, w, h: boxBottom - boxTop, fill: "#ffffff", strokeWidth: 1.5 },
		{ op: "text", x: x + w / 2, y: y + 5, text: label, fontSize: PIN_SIZE + 1, align: "center", baseline: "alphabetic", bold: true },
		{ op: "text", x: x + 3, y: structRowY, text: structural.input, fontSize: PIN_SIZE, align: "left", baseline: "middle" },
		{ op: "text", x: x + w - 3, y: structRowY, text: structural.output, fontSize: PIN_SIZE, align: "right", baseline: "middle" },
	];

	if (def.inlineSelect) {
		ops.push({
			op: "text",
			x: x + w / 2,
			y: structRowY + (boxBottom - structRowY) * 0.35,
			text: operatorSymbol(def.inlineSelect.read(data.params as never)),
			fontSize: 12,
			align: "center",
			baseline: "middle",
			bold: true,
		});
	}

	const paramRow0Y = structRowY + PIN_SIZE + PARAM_ROW_STEP / 2;
	getParameterPinRows(specs).forEach((row, i) => {
		const rowY = paramRow0Y + PARAM_ROW_STEP * i;
		if (row.input) {
			ops.push({ op: "text", x: x + 3, y: rowY, text: row.input.suffix, fontSize: PIN_SIZE, align: "left", baseline: "middle" });
			const value = safeReadParam(def, data.params, row.input.suffix);
			if (value)
				ops.push({ op: "text", x: x - 4, y: rowY, text: value, fontSize: PIN_SIZE, align: "right", baseline: "middle" });
		}
		if (row.output) {
			ops.push({ op: "text", x: x + w - 3, y: rowY, text: row.output.suffix, fontSize: PIN_SIZE, align: "right", baseline: "middle" });
			const value = safeReadParam(def, data.params, row.output.suffix);
			if (value)
				ops.push({ op: "text", x: x + w + 4, y: rowY, text: value, fontSize: PIN_SIZE, align: "left", baseline: "middle" });
		}
	});

	return ops;
}

function safeReadParam(
	def: (typeof BLOCK_DEFINITIONS)[keyof typeof BLOCK_DEFINITIONS],
	params: BlockData["params"],
	suffix: string,
): string {
	try {
		return def.readParam(params as never, suffix) ?? "";
	} catch {
		return "";
	}
}

function blockOps(
	element: LadderElement & { type: "block" },
	context: LadderRenderContext,
): DrawOp[] {
	if (element.data.blockType === "compare") {
		return compareBlockOps(element, element.data.params as never);
	}
	return boxBlockOps(element, context);
}

function elementOps(
	element: LadderElement,
	context: LadderRenderContext,
): DrawOp[] {
	switch (element.type) {
		case "contact":
			return contactOps(element);
		case "coil":
			return coilOps(element);
		case "block":
			return blockOps(element, context);
	}
	return [];
}

// --- sections ----------------------------------------------------------

/** Rapproche le contenu du rail : décale les éléments (jamais les bornes de rail) pour que la
 * première colonne occupée devienne la colonne 1 et la première ligne la ligne 0. */
function trimEmptyLeading(elements: LadderElement[]): LadderElement[] {
	const placed = elements.filter((e) => e.type !== "railTerminal");
	if (placed.length === 0) return elements;
	const colShift = Math.max(0, Math.min(...placed.map((e) => e.position.col)) - 1);
	const rowShift = Math.min(...elements.map((e) => e.position.row));
	if (colShift === 0 && rowShift === 0) return elements;
	return elements.map((e) =>
		e.type === "railTerminal"
			? { ...e, position: { ...e.position, row: e.position.row - rowShift } }
			: {
					...e,
					position: {
						row: e.position.row - rowShift,
						col: e.position.col - colShift,
					},
				},
	);
}

/** Une section rendue : son intitulé (pour la bande de titre de la page) et sa scène de dessin. */
export type LadderSectionScene = { heading: string; scene: Scene };

function sectionScene(
	rawSection: Section,
	index: number,
	context: LadderRenderContext,
): LadderSectionScene {
	const elements = trimEmptyLeading(rawSection.elements);
	const section = { ...rawSection, elements } as Section;

	const heading = section.title
		? `Section ${index + 1} : ${section.title}`
		: `Section ${index + 1}`;

	const ops: DrawOp[] = [];
	const railRows = section.elements
		.filter((e) => e.type === "railTerminal")
		.map((e) => e.position.row);
	if (railRows.length > 0) {
		ops.push({
			op: "line",
			x1: RAIL_LANE_WIDTH / 2,
			y1: rowToY(Math.min(...railRows)),
			x2: RAIL_LANE_WIDTH / 2,
			y2: rowToY(Math.max(...railRows)) + CELL_HEIGHT,
			strokeWidth: STROKE,
		});
		for (const row of railRows) {
			const ry = cellCenterY(row);
			ops.push({
				op: "line",
				x1: RAIL_LANE_WIDTH / 2,
				y1: ry,
				x2: POWER_RAIL_OFFSET,
				y2: ry,
				strokeWidth: STROKE,
			});
		}
	}

	const byId = new Map(section.elements.map((e) => [e.id, e]));
	for (const connection of section.connections) {
		const source = byId.get(connection.source.id);
		const target = byId.get(connection.target.id);
		if (!source || !target) continue;
		const s = handlePoint(source, connection.source.handle);
		const t = handlePoint(target, connection.target.handle);
		const points = connectionVertices(s, t, connection.data?.points);
		if (points.some(([px, py]) => px !== points[0][0] || py !== points[0][1])) {
			ops.push({
				op: "polyline",
				points: points.map(([px, py]) => [px, py]),
				strokeWidth: CONNECTION_STROKE,
			});
		}
	}

	for (const element of section.elements) {
		ops.push(...elementOps(element, context));
	}

	// Recadré sur le contenu ; l'exporter calcule une échelle commune à toutes les sections
	// (rail vertical aligné d'une page à l'autre).
	return { heading, scene: frameScene(ops, MARGIN) };
}

/**
 * Un ladder → une scène recadrée par section. L'exporter les fait couler sur les pages à une
 * échelle commune : le zoom ne se dégrade pas avec le nombre de sections et la barre
 * d'alimentation reste alignée.
 */
export default function ladderToSectionScenes(
	ladder: Ladder,
	context: LadderRenderContext = {},
): LadderSectionScene[] {
	return ladder.sections.map((section, index) =>
		sectionScene(section, index, context),
	);
}
