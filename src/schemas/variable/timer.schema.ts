export const TIMER_TYPES = ["TON", "TOF", "TP"] as const;

export type TimerType = (typeof TIMER_TYPES)[number];

export default class Timer {
	id: string;
	mnemonic: string;
	type: TimerType;

	IN: boolean = false; // Input signal
	PT: number = 0; // Preset Time (in ms)
	Q: boolean = false; // Output signal
	ET: number = 0; // Elapsed Time (in ms)

	constructor(id: string, mnemonic: string, type: TimerType, presetTimeMs: number = 0) {
		this.id = id;
		this.mnemonic = mnemonic;
		this.type = type;
		this.PT = presetTimeMs;
	}
}
