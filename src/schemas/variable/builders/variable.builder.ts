import Variable, { VariableOwnerBlock, VariableType, VariableZone } from "../variable.schema";

export default class VariableBuilder {
	private _id: string;
	private _mnemonic: string;
	private _zone: VariableZone;
	private _type: VariableType;
	private _address?: string;
	private _comment?: string;
	private _ownerBlock?: VariableOwnerBlock;

	constructor() {
		this._id = "";
		this._mnemonic = "var";
		this._zone = "memory";
		this._type = "BOOL";
	}

	id(id: string): VariableBuilder {
		this._id = id;
		return this;
	}

	mnemonic(mnemonic: string): VariableBuilder {
		this._mnemonic = mnemonic;
		return this;
	}

	zone(zone: VariableZone): VariableBuilder {
		this._zone = zone;
		return this;
	}

	type(type: VariableType): VariableBuilder {
		this._type = type;
		return this;
	}

	address(address: string): VariableBuilder {
		this._address = address;
		return this;
	}

	comment(comment: string): VariableBuilder {
		this._comment = comment;
		return this;
	}

	ownerBlock(ownerBlock: VariableOwnerBlock): VariableBuilder {
		this._ownerBlock = ownerBlock;
		return this;
	}

	build(): Variable {
		const variable = new Variable(this._id, this._mnemonic, this._zone, this._type, this._ownerBlock);
		if (this._address !== undefined) {
			variable.address = this._address;
		}
		if (this._comment !== undefined) {
			variable.comment = this._comment;
		}
		return variable;
	}

	// Static factory methods for common variable patterns
	static buildLogicInput(id: string, mnemonic: string): Variable {
		return new VariableBuilder().id(id).mnemonic(mnemonic).zone("logic-input").type("BOOL").build();
	}

	static buildLogicOutput(id: string, mnemonic: string): Variable {
		return new VariableBuilder().id(id).mnemonic(mnemonic).zone("logic-output").type("BOOL").build();
	}

	static buildMemoryBool(id: string, mnemonic: string): Variable {
		return new VariableBuilder().id(id).mnemonic(mnemonic).zone("memory").type("BOOL").build();
	}

	static buildMemoryInt(id: string, mnemonic: string): Variable {
		return new VariableBuilder().id(id).mnemonic(mnemonic).zone("memory").type("INT").build();
	}

	static buildAnalogInput(id: string, mnemonic: string): Variable {
		return new VariableBuilder().id(id).mnemonic(mnemonic).zone("analog-input").type("INT").build();
	}

	static buildAnalogOutput(id: string, mnemonic: string): Variable {
		return new VariableBuilder().id(id).mnemonic(mnemonic).zone("analog-output").type("INT").build();
	}
}
