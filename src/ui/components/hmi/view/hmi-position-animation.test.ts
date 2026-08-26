import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { resolvePositionAnimationOffset } from "./hmi-position-animation";

describe("resolvePositionAnimationOffset", () => {
	it("retourne undefined si le widget ne porte aucune animation de position", () => {
		const widget = HmiWidget.create("push-button", 0, 0);
		expect(resolvePositionAnimationOffset(widget, () => undefined)).toBeUndefined();
	});

	it("retourne un décalage nul si l'animation ne porte aucune variable", () => {
		const widget = HmiWidget.create("push-button", 0, 0);
		widget.data = { ...widget.data, animations: { position: {} } };
		expect(resolvePositionAnimationOffset(widget, () => undefined)).toEqual({ dx: 0, dy: 0 });
	});

	it("résout dx/dy à partir des variables liées, indépendamment l'une de l'autre", () => {
		const widget = HmiWidget.create("push-button", 0, 0);
		widget.data = {
			...widget.data,
			animations: { position: { xVariableMnemonic: "X_OFFSET", yVariableMnemonic: "Y_OFFSET" } },
		};
		const getVariableValue = (mnemonic: string) => (mnemonic === "X_OFFSET" ? 12 : mnemonic === "Y_OFFSET" ? -5 : undefined);
		expect(resolvePositionAnimationOffset(widget, getVariableValue)).toEqual({ dx: 12, dy: -5 });
	});

	it("retombe sur 0 si une variable liée est introuvable", () => {
		const widget = HmiWidget.create("push-button", 0, 0);
		widget.data = { ...widget.data, animations: { position: { xVariableMnemonic: "INCONNUE" } } };
		expect(resolvePositionAnimationOffset(widget, () => undefined)).toEqual({ dx: 0, dy: 0 });
	});
});
