export type ConnectionSide<TKind = string> = {
	type: TKind;
	id: string;
	handle: string;
};
export type ConnectionData = { points: [number, number][] };
export type HandleType = "source" | "target";

export default class Connection<TKind = string> {
	id: string;
	source: ConnectionSide<TKind>;
	target: ConnectionSide<TKind>;
	data: ConnectionData;

	constructor(
		id: string,
		source: ConnectionSide<TKind>,
		target: ConnectionSide<TKind>,
		data: ConnectionData = { points: [] },
	) {
		this.id = id;
		this.source = source;
		this.target = target;
		this.data = data;
	}

	copy(): Connection<TKind> {
		return new Connection<TKind>(
			this.id,
			{ ...this.source },
			{ ...this.target },
			{
				points: this.data?.points
					? this.data.points.map((p) => [p[0], p[1]])
					: [],
			},
		);
	}

	static createFromJSON<TKind = string>(json: string): Connection<TKind> {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new (this as any)(
				"",
				{ type: "" as any, id: "", handle: "" },
				{ type: "" as any, id: "", handle: "" },
				{ points: [] },
			),
			jsonParsed,
		);
	}
}
