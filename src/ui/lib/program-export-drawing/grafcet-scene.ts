import Action from "@/schemas/grafcet/action.schema";
import Element from "@/schemas/grafcet/element.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { JunctionData } from "@/schemas/grafcet/junction.schema";
import {
	getConnectionLinePoints,
	getFlowDimensions,
} from "@/ui/utils/grafcet/grafcet-utils";
import { DrawOp, Scene } from "./draw-op";
import grafcetHandlePosition from "./grafcet-handle-position";
import { framePage } from "./scene-geometry";
import { wrapText } from "./text-layout";

const MARGIN = 12;
const STROKE = 2;
const NODE_STROKE = 1.5;
const CONNECTION_STROKE = 2;
const TEXT_SIZE = 13;
/** Demi-largeur de la barre d'une transition (cf. `TransitionNode` : 25px centrés). */
const TRANSITION_BAR_HALF = 12.5;

/** Coordonnées absolues du tracé d'une connexion (extrémités = handles, coudes = `data.points`). */
function connectionVertices(
	grafcet: Grafcet,
	connection: Grafcet["connections"][number],
): [number, number][] | null {
	const source = grafcet.getElementById(connection.source.id);
	const target = grafcet.getElementById(connection.target.id);
	if (!source || !target) return null;
	const s = grafcetHandlePosition(source, connection.source.handle);
	const t = grafcetHandlePosition(target, connection.target.handle);
	if (connection.data?.points?.length) {
		return [s, ...connection.data.points, t];
	}
	return getConnectionLinePoints(s[0], s[1], t[0], t[1]);
}

function stepOps(step: Element<{ number: number | ""; initial?: boolean }>): DrawOp[] {
	const { x, y } = step.position;
	const { width: w, height: h } = step.size;
	const ops: DrawOp[] = [
		{ op: "rect", x, y, w, h, rx: 5, fill: "#ffffff", strokeWidth: NODE_STROKE },
	];
	if (step.data.initial) {
		ops.push({
			op: "rect",
			x: x + 3,
			y: y + 3,
			w: w - 6,
			h: h - 6,
			rx: 3,
			strokeWidth: NODE_STROKE,
		});
	}
	ops.push({
		op: "text",
		x: x + w / 2,
		y: y + h / 2,
		text: String(step.data.number),
		fontSize: 16,
		align: "center",
		baseline: "middle",
	});
	return ops;
}

function transitionOps(
	transition: Element<{ expression: string }>,
): DrawOp[] {
	const { x, y } = transition.position;
	const { width: w, height: h } = transition.size;
	const cx = x + w / 2;
	const midY = y + h / 2;
	const ops: DrawOp[] = [
		// Ligne de liaison verticale continue traversant la transition, + barre centrée.
		{ op: "line", x1: cx, y1: y, x2: cx, y2: y + h, strokeWidth: CONNECTION_STROKE },
		{
			op: "line",
			x1: cx - TRANSITION_BAR_HALF,
			y1: midY,
			x2: cx + TRANSITION_BAR_HALF,
			y2: midY,
			strokeWidth: STROKE,
		},
	];
	const expression = transition.data.expression.split("\n").join(" ");
	if (expression) {
		ops.push({
			op: "text",
			x: cx + TRANSITION_BAR_HALF + 6,
			y: midY,
			text: expression,
			fontSize: TEXT_SIZE,
			align: "left",
			baseline: "middle",
		});
	}
	return ops;
}

function actionOps(action: Action): DrawOp[] {
	const { x, y } = action.position;
	const { width: w, height: h } = action.size;
	const ops: DrawOp[] = [
		{ op: "rect", x, y, w, h, rx: 5, fill: "#ffffff", strokeWidth: STROKE },
	];
	const lines = wrapText(
		action.data.expression,
		w - 16,
		TEXT_SIZE,
	).filter((l) => l !== "");
	const lineHeight = TEXT_SIZE * 1.25;
	const startY = y + h / 2 - ((lines.length - 1) * lineHeight) / 2;
	lines.forEach((line, i) => {
		ops.push({
			op: "text",
			x: x + 8,
			y: startY + i * lineHeight,
			text: line,
			fontSize: TEXT_SIZE,
			align: "left",
			baseline: "middle",
		});
	});
	return ops;
}

function commentOps(comment: Element<{ text: string }>): DrawOp[] {
	const { x, y } = comment.position;
	const { width: w, height: h } = comment.size;
	const ops: DrawOp[] = [
		{
			op: "rect",
			x,
			y,
			w,
			h,
			rx: 5,
			fill: "#ffffff",
			strokeWidth: 1,
			dash: [4, 3],
		},
	];
	const lineHeight = TEXT_SIZE * 1.3;
	wrapText(comment.data.text ?? "", w - 10, TEXT_SIZE).forEach((line, i) => {
		ops.push({
			op: "text",
			x: x + 5,
			y: y + 6 + i * lineHeight,
			text: line,
			fontSize: TEXT_SIZE,
			align: "left",
			baseline: "top",
		});
	});
	return ops;
}

function referralOps(
	element: Element<{ targetStepNumber?: number | ""; sourceStepNumber?: number | "" }>,
	direction: "source" | "target",
): DrawOp[] {
	const { x, y } = element.position;
	const { width: w, height: h } = element.size;
	const cx = x + w / 2;
	// Chevron toujours orienté vers le bas (sens du flux). Un tenant (`source`) reçoit la liaison
	// par le haut : trait puis chevron puis numéro dessous. Un aboutissant (`target`) émet vers le
	// bas : numéro puis chevron puis trait jusqu'au bas.
	const chevronY = direction === "source" ? y + h - 20 : y + 20;
	const downChevron: DrawOp = {
		op: "polyline",
		points: [
			[cx - 5, chevronY - 4],
			[cx, chevronY + 4],
			[cx + 5, chevronY - 4],
		],
		strokeWidth: 1.5,
	};
	const number =
		direction === "source"
			? element.data.targetStepNumber
			: element.data.sourceStepNumber;
	if (direction === "source") {
		return [
			{ op: "line", x1: cx, y1: y, x2: cx, y2: chevronY, strokeWidth: 1.5 },
			downChevron,
			{ op: "text", x: cx, y: y + h - 2, text: String(number ?? ""), fontSize: 14, align: "center", baseline: "alphabetic" },
		];
	}
	return [
		{ op: "text", x: cx, y: y + 10, text: String(number ?? ""), fontSize: 14, align: "center", baseline: "middle" },
		downChevron,
		{ op: "line", x1: cx, y1: chevronY, x2: cx, y2: y + h, strokeWidth: 1.5 },
	];
}

function junctionOps(
	junction: Element<JunctionData>,
	kind: "and" | "or",
	side: "start" | "end",
): DrawOp[] {
	const { x, y } = junction.position;
	const { height: h } = junction.size;
	const data = junction.data;
	const positions = [
		data.pivotPosition,
		...data.branchesOrder.map((id) => data.branches[id]?.position ?? 0),
	];
	const barY = y + h / 2;
	const x1 = x + Math.min(...positions);
	const x2 = x + Math.max(...positions);
	const ops: DrawOp[] = [];
	const bar = (offset: number): DrawOp => ({
		op: "line",
		x1,
		y1: barY + offset,
		x2,
		y2: barY + offset,
		strokeWidth: STROKE,
	});
	if (kind === "and") {
		ops.push(bar(-2), bar(2));
	} else {
		ops.push(bar(0));
	}
	// Antennes : du pivot et de chaque branche vers la barre.
	const pivotHandleY = side === "start" ? y : y + h;
	ops.push({
		op: "line",
		x1: x + data.pivotPosition,
		y1: pivotHandleY,
		x2: x + data.pivotPosition,
		y2: barY,
		strokeWidth: STROKE,
	});
	const branchHandleY = side === "start" ? y + h : y;
	for (const id of data.branchesOrder) {
		const bx = x + (data.branches[id]?.position ?? 0);
		ops.push({
			op: "line",
			x1: bx,
			y1: branchHandleY,
			x2: bx,
			y2: barY,
			strokeWidth: STROKE,
		});
	}
	return ops;
}

function elementOps(element: Element<unknown>): DrawOp[] {
	switch (element.type) {
		case "step":
			return stepOps(element as never);
		case "transition":
			return transitionOps(element as never);
		case "action":
			return actionOps(element as Action);
		case "comment":
			return commentOps(element as never);
		case "step-referral-source":
			return referralOps(element as never, "source");
		case "step-referral-target":
			return referralOps(element as never, "target");
		case "junction-and-start":
			return junctionOps(element as never, "and", "start");
		case "junction-and-end":
			return junctionOps(element as never, "and", "end");
		case "junction-or-start":
			return junctionOps(element as never, "or", "start");
		case "junction-or-end":
			return junctionOps(element as never, "or", "end");
	}
	return [];
}

/** Scène de dessin d'un grafcet, recadrée sur son contenu (voir `frameScene`). */
export default function grafcetToScene(grafcet: Grafcet): Scene {
	const ops: DrawOp[] = [];

	for (const connection of grafcet.connections) {
		const vertices = connectionVertices(grafcet, connection);
		if (vertices) {
			ops.push({
				op: "polyline",
				points: vertices.map(([x, y]) => [x, y]),
				strokeWidth: CONNECTION_STROKE,
			});
		}
	}

	for (const element of grafcet.getAllElements()) {
		ops.push(...elementOps(element));
	}

	const page = getFlowDimensions(grafcet.format);
	return framePage(ops, page.width, page.height, MARGIN);
}
