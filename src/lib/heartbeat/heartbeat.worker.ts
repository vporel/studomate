/** Dedicated worker: posts `"tick"` every `intervalMs`, unaffected by the throttling of a hidden tab. */
let timer: ReturnType<typeof setInterval> | undefined;

self.onmessage = (
	event: MessageEvent<{ type: "start"; intervalMs: number } | { type: "stop" }>,
) => {
	clearInterval(timer);
	timer = undefined;
	if (event.data.type === "start") {
		timer = setInterval(() => self.postMessage("tick"), event.data.intervalMs);
	}
};
