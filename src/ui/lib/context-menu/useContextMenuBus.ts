import type { Emitter, EventType } from "mitt";
import { useEffect } from "react";

/**
 * Subscribes to the `show` and `hide` events of a context-menu event bus for the lifetime of
 * the component. Handlers should be referentially stable (`useCallback`), a new reference
 * resubscribes.
 */
export default function useContextMenuBus<
	E extends Record<EventType, unknown> & { show: unknown; hide: unknown },
>(
	events: Emitter<E>,
	onShow: (props: E["show"]) => void,
	hide: () => void,
) {
	useEffect(() => {
		events.on("show", onShow);
		events.on("hide", hide);
		return () => {
			events.off("show", onShow);
			events.off("hide", hide);
		};
	}, [events, onShow, hide]);
}
