/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { createRef } from "react";
import useInViewport from "./useInViewport";

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

class IntersectionObserverStub {
	static instances: IntersectionObserverStub[] = [];
	callback: ObserverCallback;
	rootMargin: string;
	observed: Element[] = [];
	disconnected = false;

	constructor(callback: ObserverCallback, options?: { rootMargin?: string }) {
		this.callback = callback;
		this.rootMargin = options?.rootMargin ?? "";
		IntersectionObserverStub.instances.push(this);
	}
	observe(element: Element) {
		this.observed.push(element);
	}
	unobserve() {}
	disconnect() {
		this.disconnected = true;
	}
	trigger(isIntersecting: boolean) {
		this.callback([{ isIntersecting }]);
	}
}

function refToDiv() {
	const ref = createRef<HTMLDivElement>();
	(ref as { current: HTMLDivElement }).current = document.createElement("div");
	return ref;
}

describe("useInViewport", () => {
	beforeEach(() => {
		IntersectionObserverStub.instances.length = 0;
		(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
			IntersectionObserverStub;
	});

	it("renvoie false tant que l'élément n'a pas croisé le viewport", () => {
		const { result } = renderHook(() => useInViewport(refToDiv()));
		expect(result.current).toBe(false);
	});

	it("passe à true à la première intersection et le reste ensuite", () => {
		const ref = refToDiv();
		const { result } = renderHook(() => useInViewport(ref));

		act(() => IntersectionObserverStub.instances[0].trigger(true));
		expect(result.current).toBe(true);

		act(() => IntersectionObserverStub.instances[0].trigger(false));
		expect(result.current).toBe(true);
	});

	it("déconnecte l'observer une fois vu", () => {
		const { result } = renderHook(() => useInViewport(refToDiv()));
		act(() => IntersectionObserverStub.instances[0].trigger(true));
		expect(result.current).toBe(true);
		expect(IntersectionObserverStub.instances[0].disconnected).toBe(true);
	});

	it("transmet rootMargin à l'observer", () => {
		renderHook(() => useInViewport(refToDiv(), { rootMargin: "800px 0px" }));
		expect(IntersectionObserverStub.instances[0].rootMargin).toBe("800px 0px");
	});

	it("renvoie true d'emblée sans IntersectionObserver", () => {
		(global as unknown as { IntersectionObserver?: unknown }).IntersectionObserver =
			undefined;
		const { result } = renderHook(() => useInViewport(refToDiv()));
		expect(result.current).toBe(true);
	});
});
