import { ElementType } from "@/schemas/grafcet/element.schema";
import ActionAnalyser from "./action.analyser";
import DefaultElementAnalyser from "./default-element.analyser";
import ElementAnalyserFactory from "./element-analyser.factory";
import JunctionAndEndAnalyser from "./junction-and-end.analyser";
import JunctionAndStartAnalyser from "./junction-and-start.analyser";
import JunctionOrEndAnalyser from "./junction-or-end.analyser";
import JunctionOrStartAnalyser from "./junction-or-start.analyser";
import StepReferralSourceAnalyser from "./step-referral-source.analyser";
import StepReferralTargetAnalyser from "./step-referral-target.analyser";
import StepAnalyser from "./step.analyser";
import TransitionAnalyser from "./transition.analyser";

describe("ElementAnalyserFactory", () => {
	describe("getAnalyserForType", () => {
		it("returns StepAnalyser for step type", () => {
			const analyser = ElementAnalyserFactory.getAnalyserForType("step");
			expect(analyser).toBeInstanceOf(StepAnalyser);
		});

		it("returns ActionAnalyser for action type", () => {
			const analyser = ElementAnalyserFactory.getAnalyserForType("action");
			expect(analyser).toBeInstanceOf(ActionAnalyser);
		});

		it("returns TransitionAnalyser for transition type", () => {
			const analyser = ElementAnalyserFactory.getAnalyserForType("transition");
			expect(analyser).toBeInstanceOf(TransitionAnalyser);
		});

		it("returns StepReferralSourceAnalyser for step-referral-source type", () => {
			const analyser = ElementAnalyserFactory.getAnalyserForType("step-referral-source");
			expect(analyser).toBeInstanceOf(StepReferralSourceAnalyser);
		});

		it("returns StepReferralTargetAnalyser for step-referral-target type", () => {
			const analyser = ElementAnalyserFactory.getAnalyserForType("step-referral-target");
			expect(analyser).toBeInstanceOf(StepReferralTargetAnalyser);
		});

		it("returns JunctionAndStartAnalyser for junction-and-start type", () => {
			const analyser = ElementAnalyserFactory.getAnalyserForType("junction-and-start");
			expect(analyser).toBeInstanceOf(JunctionAndStartAnalyser);
		});

		it("returns JunctionAndEndAnalyser for junction-and-end type", () => {
			const analyser = ElementAnalyserFactory.getAnalyserForType("junction-and-end");
			expect(analyser).toBeInstanceOf(JunctionAndEndAnalyser);
		});

		it("returns JunctionOrStartAnalyser for junction-or-start type", () => {
			const analyser = ElementAnalyserFactory.getAnalyserForType("junction-or-start");
			expect(analyser).toBeInstanceOf(JunctionOrStartAnalyser);
		});

		it("returns JunctionOrEndAnalyser for junction-or-end type", () => {
			const analyser = ElementAnalyserFactory.getAnalyserForType("junction-or-end");
			expect(analyser).toBeInstanceOf(JunctionOrEndAnalyser);
		});

		it("returns DefaultElementAnalyser for comment type", () => {
			const analyser = ElementAnalyserFactory.getAnalyserForType("comment");
			expect(analyser).toBeInstanceOf(DefaultElementAnalyser);
		});

		it("returns same analyser instance for same type", () => {
			const analyser1 = ElementAnalyserFactory.getAnalyserForType("step");
			const analyser2 = ElementAnalyserFactory.getAnalyserForType("step");
			expect(analyser1).toBe(analyser2);
		});

		it("supports all element types", () => {
			const allTypes: ElementType[] = [
				"step",
				"action",
				"transition",
				"step-referral-source",
				"step-referral-target",
				"junction-and-start",
				"junction-and-end",
				"junction-or-start",
				"junction-or-end",
				"comment",
			];

			allTypes.forEach((type) => {
				expect(() => ElementAnalyserFactory.getAnalyserForType(type)).not.toThrow();
				const analyser = ElementAnalyserFactory.getAnalyserForType(type);
				expect(analyser).toBeDefined();
				expect(analyser.analyseIsolated).toBeDefined();
				expect(analyser.analyseInContext).toBeDefined();
			});
		});
	});
});
