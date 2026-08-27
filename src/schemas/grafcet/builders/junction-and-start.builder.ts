import { createRandomId } from "@/ids";
import JunctionAndStart from "../junction-and-start.schema";
import { JunctionData } from "../junction.schema";
import { Dimensions, XYPosition } from "../shared-types";

export default class JunctionAndStartBuilder {
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

	id(id: string): JunctionAndStartBuilder {
		this._id = id;
		return this;
	}

	nBranches(n: number): JunctionAndStartBuilder {
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

	dimensions(width: number, height: number): JunctionAndStartBuilder {
		this._size = { width, height };
		this._data.pivotPosition = width / 2;
		return this;
	}

	pivotPosition(position: number): JunctionAndStartBuilder {
		this._data.pivotPosition = position;
		return this;
	}

	position(x: number, y: number): JunctionAndStartBuilder {
		this._position = { x, y };
		return this;
	}

	build(): JunctionAndStart {
		return new JunctionAndStart(
			this._id,
			{ ...this._data },
			{ ...this._position },
			{ ...this._size },
		);
	}
}
