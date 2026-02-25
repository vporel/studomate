export const focusFlow = (grafcetId: string) => {
	const grafcetFlowContainer = document.getElementById(`grafcet-${grafcetId}`) as HTMLElement | null;
	const grafcetFlow = grafcetFlowContainer?.querySelector(".react-flow") as HTMLElement | null;
	setTimeout(() => {
		grafcetFlow?.focus({ preventScroll: true });
	}, 10);
};
