/** Calls `tick` every `intervalMs` ; returns the stop function. */
export type HeartbeatScheduler = (
	tick: () => void,
	intervalMs: number,
) => () => void;
