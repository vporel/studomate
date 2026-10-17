"use client";

import { useEffect, useState } from "react";

/**
 * Follows a value of the model state at the display rate, for components outside the canvas.
 * `select` must be a stable function (declared at module level). `fallback` stands for as long
 * as the scene has no state. A selected object is only replaced when `equals` says it changed,
 * so that components re-render on actual changes only.
 */
export default function useSampledValue<State, Value>(
	sample: () => unknown,
	select: (state: State) => Value,
	fallback: Value,
	equals: (a: Value, b: Value) => boolean = Object.is,
): Value {
	const [value, setValue] = useState<Value>(fallback);
	useEffect(() => {
		let frame = 0;
		const tick = () => {
			const state = sample() as State | null;
			if (state) {
				const next = select(state);
				setValue((previous) => (equals(previous, next) ? previous : next));
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [sample, select, equals]);
	return value;
}
