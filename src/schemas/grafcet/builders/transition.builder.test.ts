import Transition from "../transition.schema";
import TransitionBuilder from "./transition.builder";

describe("TransitionBuilder", () => {
	it("builds a transition with default values", () => {
		const transition = new TransitionBuilder().id("trans-1").build();

		expect(transition).toBeInstanceOf(Transition);
		expect(transition.id).toBe("trans-1");
		expect(transition.type).toBe("transition");
		expect(transition.data.expression).toBe("");
		expect(transition.size.width).toBe(Transition.DEFAULT_DIMENSIONS.width);
		expect(transition.size.height).toBe(Transition.DEFAULT_DIMENSIONS.height);
		expect(transition.position).toEqual({ x: 0, y: 0 });
	});

	it("builds a transition with custom expression", () => {
		const transition = new TransitionBuilder()
			.id("trans-1")
			.expression("x > 5")
			.build();

		expect(transition.data.expression).toBe("x > 5");
	});

	it("builds a transition with custom dimensions", () => {
		const transition = new TransitionBuilder()
			.id("trans-1")
			.dimensions(100, 50)
			.build();

		expect(transition.size.width).toBe(100);
		expect(transition.size.height).toBe(50);
	});

	it("builds a transition with custom position", () => {
		const transition = new TransitionBuilder()
			.id("trans-1")
			.position(200, 300)
			.build();

		expect(transition.position).toEqual({ x: 200, y: 300 });
	});

	it("builds a complete transition with all properties", () => {
		const transition = new TransitionBuilder()
			.id("trans-1")
			.expression("a && b")
			.dimensions(80, 40)
			.position(100, 150)
			.build();

		expect(transition.id).toBe("trans-1");
		expect(transition.data.expression).toBe("a && b");
		expect(transition.size.width).toBe(80);
		expect(transition.size.height).toBe(40);
		expect(transition.position).toEqual({ x: 100, y: 150 });
	});

	it("allows method chaining", () => {
		const builder = new TransitionBuilder();
		const result = builder.id("trans-1");

		expect(result).toBe(builder);
	});

	it("builds multiple transitions independently", () => {
		const trans1 = new TransitionBuilder()
			.id("trans-1")
			.expression("expr1")
			.build();
		const trans2 = new TransitionBuilder()
			.id("trans-2")
			.expression("expr2")
			.build();

		expect(trans1.id).toBe("trans-1");
		expect(trans1.data.expression).toBe("expr1");
		expect(trans2.id).toBe("trans-2");
		expect(trans2.data.expression).toBe("expr2");
	});
});
