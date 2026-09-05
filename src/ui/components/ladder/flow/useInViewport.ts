import { RefObject, useEffect, useState } from "react";

/**
 * Passe à `true` la première fois que l'élément référencé entre (ou approche, selon
 * `rootMargin`) le viewport, et le reste ensuite : le montage d'une section Ladder est coûteux
 * (instance React Flow complète), on ne veut le payer qu'une fois et jamais le défaire au
 * défilement.
 *
 * Sans `IntersectionObserver` (environnement sans DOM), renvoie `true` d'emblée.
 */
export default function useInViewport(
	ref: RefObject<Element | null>,
	{ rootMargin }: { rootMargin?: string } = {},
): boolean {
	const [seen, setSeen] = useState(
		() => typeof IntersectionObserver === "undefined",
	);

	useEffect(() => {
		if (seen) return;
		const element = ref.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setSeen(true);
					observer.disconnect();
				}
			},
			{ rootMargin },
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, [ref, rootMargin, seen]);

	return seen;
}
