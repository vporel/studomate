/** Calls `tick` every `intervalMs` from a context that is not throttled in a hidden tab; returns the stop function. */
export type HeartbeatScheduler = (
	tick: () => void,
	intervalMs: number,
) => () => void;
