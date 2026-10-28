import { type RefObject, useLayoutEffect, useRef, useState } from "react";

/**
 * Whether the content of `elementRef` is too wide for it, and should be shown in a more compact
 * form. Collapsing hides what the content cannot measure any more, so the width it takes once
 * expanded is remembered: the content is expanded again as soon as the element is at least that
 * wide, not before (or it would flicker between the two forms).
 *
 * The element must not shrink its content: it is the overflow of the content that is measured.
 * Its children are watched as well: they are what grows when the content changes.
 */
export default function useCollapseOnOverflow(
	elementRef: RefObject<HTMLElement | null>,
): boolean {
	const [collapsed, setCollapsed] = useState(false);
	const [resizes, setResizes] = useState(0);
	const expandedWidth = useRef<number | null>(null);

	useLayoutEffect(() => {
		const element = elementRef.current;
		if (!element) return;
		if (!collapsed) {
			expandedWidth.current = element.scrollWidth;
			if (element.scrollWidth > element.clientWidth) setCollapsed(true);
		} else if (
			expandedWidth.current !== null &&
			element.clientWidth >= expandedWidth.current
		) {
			setCollapsed(false);
		}
	}, [elementRef, collapsed, resizes]);

	useLayoutEffect(() => {
		const element = elementRef.current;
		if (!element || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => setResizes((n) => n + 1));
		observer.observe(element);
		for (const child of Array.from(element.children)) observer.observe(child);
		return () => observer.disconnect();
	}, [elementRef]);

	return collapsed;
}
