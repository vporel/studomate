/** @jest-environment jsdom */
import { render } from "@testing-library/react";
import ContextMenuItem from "./ContextMenuItem";

/**
 * jsdom ne fait pas de layout : on force les dimensions lues par le composant pour tester
 * le choix du côté d'ouverture du sous-menu.
 */
function stubLayout({ subWidth }: { subWidth: number }) {
	const descriptors = {
		offsetTop: { get: () => 0 },
		offsetHeight: { get: () => 30 },
		scrollHeight: { get: () => 40 },
		offsetWidth: {
			get(this: HTMLElement) {
				return this.classList.contains("sub-items-container") ? subWidth : 0;
			},
		},
	};
	const saved = Object.entries(descriptors).map(([key]) => [
		key,
		Object.getOwnPropertyDescriptor(HTMLElement.prototype, key),
	]) as [string, PropertyDescriptor | undefined][];
	for (const [key, descriptor] of Object.entries(descriptors)) {
		Object.defineProperty(HTMLElement.prototype, key, {
			configurable: true,
			...descriptor,
		});
	}
	return () => {
		for (const [key, descriptor] of saved) {
			// jsdom définit ces propriétés sur le prototype (elles renvoient 0) : `descriptor`
			// est toujours présent, on le restaure tel quel.
			if (descriptor)
				Object.defineProperty(HTMLElement.prototype, key, descriptor);
		}
	};
}

const itemWithSub = {
	label: "Type",
	subItems: [{ label: "Texte" }, { label: "Variable" }],
};

const baseProps = {
	item: itemWithSub,
	hideMenu: jest.fn(),
	menuTop: 0,
	menuWidth: 100,
	parentHeight: 500,
};

describe("ContextMenuItem — côté d'ouverture du sous-menu", () => {
	it("ouvre vers la gauche quand le sous-menu déborderait à droite", () => {
		const restore = stubLayout({ subWidth: 200 });
		try {
			const { container } = render(
				// roomRight = 300 - (150 + 100) = 50 ; subWidth 200 > 50 et menuLeft 150 > 50
				<ContextMenuItem {...baseProps} menuLeft={150} parentWidth={300} />,
			);
			const sub = container.querySelector(".sub-items-container");
			expect(sub).toHaveStyle({ right: "100%", left: "auto" });
		} finally {
			restore();
		}
	});

	it("reste ouvert vers la droite quand il y a la place", () => {
		const restore = stubLayout({ subWidth: 200 });
		try {
			const { container } = render(
				<ContextMenuItem {...baseProps} menuLeft={10} parentWidth={1000} />,
			);
			const sub = container.querySelector(".sub-items-container");
			expect(sub).toHaveStyle({ left: "100%", right: "auto" });
		} finally {
			restore();
		}
	});
});
