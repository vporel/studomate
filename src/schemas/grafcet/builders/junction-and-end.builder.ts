import { createRandomId } from "@/ids";
import JunctionAndEnd from "../junction-and-end.schema";
import {
	JUNCTION_BRANCH_MARGIN,
	normalizeJunctionGeometry,
} from "../junction-geometry";
import { JunctionData } from "../junction.schema";
import { Dimensions, XYPosition } from "../shared-types";

export default class JunctionAndEndBuilder {
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

	id(id: string): JunctionAndEndBuilder {
		this._id = id;
		return this;
	}

	nBranches(n: number): JunctionAndEndBuilder {
		const branches: Record<string, { id: string; position: number }> = {};
		const branchesOrder: string[] = [];
		const span = this._size.width - 2 * JUNCTION_BRANCH_MARGIN;

		for (let i = 0; i < n; i++) {
			const branchId = createRandomId();
			branches[branchId] = {
				id: branchId,
				position:
					n === 1
						? this._size.width / 2
						: JUNCTION_BRANCH_MARGIN + (span * i) / (n - 1),
			};
			branchesOrder.push(branchId);
		}

		this._data.branches = branches;
		this._data.branchesOrder = branchesOrder;
		return this;
	}

	dimensions(width: number, height: number): JunctionAndEndBuilder {
		this._size = { width, height };
		this._data.pivotPosition = width / 2;
		return this;
	}

	pivotPosition(position: number): JunctionAndEndBuilder {
		this._data.pivotPosition = position;
		return this;
	}

	position(x: number, y: number): JunctionAndEndBuilder {
		this._position = { x, y };
		return this;
	}

	build(): JunctionAndEnd {
		const { data, nodeX, width } = normalizeJunctionGeometry(
			this._data,
			this._position.x,
			this._size.width,
		);
		return new JunctionAndEnd(
			this._id,
			{ ...data },
			{ x: nodeX, y: this._position.y },
			{ width, height: this._size.height },
		);
	}
}
