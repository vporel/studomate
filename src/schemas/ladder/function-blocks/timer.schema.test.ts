import {
	createTimerBlockElement,
	createTimerBlockVariables,
	getTimerBlockParams,
	getTimerBlockVariableMnemonics,
} from "./timer.schema";

describe("getTimerBlockVariableMnemonics", () => {
	it("génère les mnémoniques IN/Q/ET à partir du nom du bloc, pas PT", () => {
		expect(getTimerBlockVariableMnemonics("Tempo1")).toEqual({
			IN: "Tempo1.IN",
			Q: "Tempo1.Q",
			ET: "Tempo1.ET",
		});
	});
});

describe("createTimerBlockVariables", () => {
	it("génère les variables IN/Q (BOOL) et ET (TIME), rattachées au bloc", () => {
		const variables = createTimerBlockVariables("el1", "Tempo1");

		expect(variables.map((v) => v.mnemonic)).toEqual([
			"Tempo1.IN",
			"Tempo1.Q",
			"Tempo1.ET",
		]);
		expect(variables.map((v) => v.type)).toEqual(["BOOL", "BOOL", "TIME"]);
		expect(variables.every((v) => v.ownerBlock?.id === "el1")).toBe(true);
	});
});

describe("createTimerBlockElement", () => {
	it("pose un bloc timer à la position donnée, avec sa config dans data.params", () => {
		const block = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
			2,
			3,
		);

		expect(block.type).toBe("block");
		expect(block.data).toEqual({
			blockType: "timer",
			params: { name: "Tempo1", timerType: "TON", pt: "T#5s" },
		});
		expect(block.position).toEqual({ row: 2, col: 3 });
		expect(block.id).toBeTruthy();
	});

	it("chaque bloc créé a un id distinct", () => {
		const a = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		const b = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		expect(a.id).not.toBe(b.id);
	});
});

describe("getTimerBlockParams", () => {
	it("renvoie la config d'un bloc timer", () => {
		const block = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TOF", pt: "T#1s", et: "Sortie" },
			0,
			0,
		);

		expect(getTimerBlockParams(block)).toEqual({
			name: "Tempo1",
			timerType: "TOF",
			pt: "T#1s",
			et: "Sortie",
		});
	});

	it("renvoie null pour un bloc d'un autre type", () => {
		const block = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#1s" },
			0,
			0,
		);
		block.data = { blockType: "user-program", params: { programId: "prog1" } };

		expect(getTimerBlockParams(block)).toBeNull();
	});
});
