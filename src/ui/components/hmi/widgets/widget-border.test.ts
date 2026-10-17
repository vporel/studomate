import widgetBorder from "./widget-border";

describe("widgetBorder", () => {
	it("utilise la couleur de sélection quand le widget est sélectionné", () => {
		expect(widgetBorder(true)).toBe("2px solid #1976d2");
	});

	it.each([false, undefined])(
		"utilise la couleur neutre pour %p",
		(selected) => {
			expect(widgetBorder(selected)).toBe("2px solid #555");
		},
	);
});
