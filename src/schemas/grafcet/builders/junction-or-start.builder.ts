import { createRandomId } from "@/ids";
import JunctionOrStart from "../junction-or-start.schema";
import { JunctionData } from "../junction.schema";
import { XYPosition } from "../shared-types";

export default class JunctionOrStartBuilder {
	private _id: string;
	private _data: JunctionData;
	private _position: XYPosition;

	constructor() {
		this._id = "";
		// Generate default junction data with 2 branches
		const branch1 = { id: createRandomId(), position: 10 };
		const branch2 = { id: createRandomId(), position: 190 };
		this._data = {
			width: 200,
			height: 30,
			pivotPosition: 100,
			branches: { [branch1.id]: branch1, [branch2.id]: branch2 },
			branchesOrder: [branch1.id, branch2.id],
		};
		this._position = { x: 0, y: 0 };
	}

	id(id: string): JunctionOrStartBuilder {
		this._id = id;
		return this;
	}

	nBranches(n: number): JunctionOrStartBuilder {
		const branches: Record<string, { id: string; position: number }> = {};
		const branchesOrder: string[] = [];
		const spacing = this._data.width / (n + 1);

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

	dimensions(width: number, height: number): JunctionOrStartBuilder {
		this._data.width = width;
		this._data.height = height;
		this._data.pivotPosition = width / 2;
		return this;
	}

	pivotPosition(position: number): JunctionOrStartBuilder {
		this._data.pivotPosition = position;
		return this;
	}

	position(x: number, y: number): JunctionOrStartBuilder {
		this._position = { x, y };
		return this;
	}

	build(): JunctionOrStart {
		return new JunctionOrStart(this._id, { ...this._data }, { ...this._position });
	}
}
