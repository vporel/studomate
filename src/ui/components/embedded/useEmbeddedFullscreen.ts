"use client";

import { useCallback, useEffect, useId, useState } from "react";

const FULLSCREEN_EVENT = "studomate:embedded-fullscreen";

/**
 * Full screen state of one block. Entering it leaves the full screen of any other block of the
 * page, and locks the scrolling of the page for as long as it lasts.
 */
export default function useEmbeddedFullscreen() {
	const id = useId();
	const [fullscreen, setFullscreen] = useState(false);

	const enter = useCallback(() => {
		window.dispatchEvent(new CustomEvent(FULLSCREEN_EVENT, { detail: id }));
		setFullscreen(true);
	}, [id]);
	const exit = useCallback(() => setFullscreen(false), []);
	const toggle = useCallback(
		() => (fullscreen ? exit() : enter()),
		[fullscreen, enter, exit],
	);

	useEffect(() => {
		const onOtherEntered = (event: Event) => {
			if ((event as CustomEvent<string>).detail !== id) setFullscreen(false);
		};
		window.addEventListener(FULLSCREEN_EVENT, onOtherEntered);
		return () => window.removeEventListener(FULLSCREEN_EVENT, onOtherEntered);
	}, [id]);

	useEffect(() => {
		if (!fullscreen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [fullscreen]);

	return { fullscreen, exit, toggle };
}
