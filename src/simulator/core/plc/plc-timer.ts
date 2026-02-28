export type PLCTimerType = "TON" | "TOF" | "TP";

export interface PLCTimerConfig {
	type: PLCTimerType;
	presetTime: number; // PT in ms
}

export default class PLCTimer {
	public Q: boolean = false;
	public ET: number = 0;

	// Configuration
	private type: PLCTimerType;
	private PT: number;

	// internal state
	private lastInput: boolean = false;
	private running: boolean = false;
	private lastUpdateTimestamp: number = 0;

	constructor(config: PLCTimerConfig) {
		this.type = config.type;
		this.PT = config.presetTime;
	}

	/**
	 * @param inputState Input signal state (true or false)
	 * @param currentTime Timestamp in ms
	 */
	execute(inputState: boolean, currentTime: number): void {
		// Initialization on the first call
		if (this.lastUpdateTimestamp === 0) {
			this.lastUpdateTimestamp = currentTime;
		}

		const deltaTime = currentTime - this.lastUpdateTimestamp;
		this.lastUpdateTimestamp = currentTime;

		const risingEdge = inputState && !this.lastInput;
		this.lastInput = inputState;

		switch (this.type) {
			case "TON":
				if (!inputState) {
					this.ET = 0;
					this.Q = false;
				} else {
					this.ET = Math.min(this.PT, this.ET + deltaTime);
					this.Q = this.ET >= this.PT;
				}
				break;

			case "TOF":
				if (inputState) {
					this.ET = 0;
					this.Q = true;
				} else {
					this.ET = Math.min(this.PT, this.ET + deltaTime);
					this.Q = this.ET < this.PT;
				}
				break;

			case "TP":
				if (risingEdge && !this.running) {
					this.running = true;
					this.ET = 0;
				}
				if (this.running) {
					this.ET += deltaTime;
					this.Q = true;
					if (this.ET >= this.PT) {
						this.running = false;
						this.Q = false;
						this.ET = this.PT;
					}
				} else {
					// In TP, if not "running", ET should remain at 0
					// or PT depending on whether we want to keep track of the last cycle
					if (!this.running) this.Q = false;
				}
				break;
		}
	}

	/**
	 * Allows updating the PT setpoint dynamically
	 * (if the user changes the value during simulation)
	 */
	updateConfig(newPT: number): void {
		this.PT = newPT;
	}

	reset(): void {
		this.ET = 0;
		this.Q = false;
		this.running = false;
		this.lastUpdateTimestamp = 0;
		this.lastInput = false;
	}
}
