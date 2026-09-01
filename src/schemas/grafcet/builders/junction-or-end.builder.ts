import { createRandomId } from "@/ids";
import JunctionOrEnd from "../junction-or-end.schema";
import { JunctionData } from "../junction.schema";
import { Dimensions, XYPosition } from "../shared-types";

export default class JunctionOrEndBuilder {
	private _id: string;
	private _data: JunctionData;
	private _position: XYPosition;
	private _size: Dimensions;

	constructor() {
		this._id = "";
		// Generate default junction data with 2 branches
		const branch1 = { id: createRandomId(), position: 10 };
		const branch2 = { id: createRandomId(), position: 190 };
		this._data = {
			pivotPosition: 100,
			branches: { [branch1.id]: branch1, [branch2.id]: branch2 },
			branchesOrder: [branch1.id, branch2.id],
		};
		this._position = { x: 0, y: 0 };
		this._size = { width: 200, height: 30 };
	}

	id(id: string): JunctionOrEndBuilder {
		this._id = id;
		return this;
	}

	nBranches(n: number): JunctionOrEndBuilder {
		const branches: Record<string, { id: string; position: number }> = {};
		const branchesOrder: string[] = [];
		const spacing = this._size.width / (n + 1);

		for (let i = 0; i < n; i++) {
			const branchId = createRandomId();
			branches[branchId] = {
				id: branchId,
				position: spacing * (i + 1),
			};
			branchesOrder.push(branchId);
		}

		this._data.branches = branches;
		this._data.branchesOrder = branchesOrder;
		return this;
	}

	dimensions(width: number, height: number): JunctionOrEndBuilder {
		this._size = { width, height };
		this._data.pivotPosition = width / 2;
		return this;
	}

	/** Positionne chaque branche (offset en px le long de la barre), dans l'ordre de `branchesOrder`. */
	branchesPositions(...positions: number[]): JunctionOrEndBuilder {
		const order = this._data.branchesOrder;
		if (positions.length !== order.length) {
			throw new Error(
				`branchesPositions attend ${order.length} valeur(s), ${positions.length} reçue(s).`,
			);
		}
		order.forEach((branchId, i) => {
			this._data.branches[branchId] = {
				...this._data.branches[branchId],
				position: positions[i],
			};
		});
		return this;
	}

	pivotPosition(position: number): JunctionOrEndBuilder {
		this._data.pivotPosition = position;
		return this;
	}

	position(x: number, y: number): JunctionOrEndBuilder {
		this._position = { x, y };
		return this;
	}

	build(): JunctionOrEnd {
		return new JunctionOrEnd(
			this._id,
			{ ...this._data },
			{ ...this._position },
			{ ...this._size },
		);
	}
}
