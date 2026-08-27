export function getSvgPathFromStroke(stroke: number[][]) {
	if (!stroke.length) return "";

	const d = stroke.reduce(
		(acc, [x0, y0], i, arr) => {
			const [x1, y1] = arr[(i + 1) % arr.length];
			acc.push(x0, y0, ",", (x0 + x1) / 2, (y0 + y1) / 2);
			return acc;
		},
		["M", ...stroke[0], "Q"],
	);

	d.push("Z");
	return d.join(" ");
}

export function getStraightPathFromPoints(points: number[][]): string {
	const commands = [];
	commands.push(`M ${points[0][0]},${points[0][1]}`);
	for (let i = 1; i < points.length; i++) {
		commands.push(`L ${points[i][0]},${points[i][1]}`);
	}
	return commands.join(" ");
}
