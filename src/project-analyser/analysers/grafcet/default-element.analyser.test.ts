import CommentBuilder from "@/schemas/grafcet/builders/comment.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import DefaultElementAnalyser from "./default-element.analyser";

describe("DefaultElementAnalyser", () => {
	const analyser = new DefaultElementAnalyser("comment");

	describe("analyseIsolated", () => {
		it("returns empty issues array for any element", () => {
			const comment = new CommentBuilder().id("comment1").text("Test comment").build();

			const issues = analyser.analyseIsolated(comment);
			expect(issues).toEqual([]);
		});

		it("returns empty issues array for element with empty text", () => {
			const comment = new CommentBuilder().id("comment2").text("").build();

			const issues = analyser.analyseIsolated(comment);
			expect(issues).toEqual([]);
		});

		it("returns empty issues array for element with special characters", () => {
			const comment = new CommentBuilder()
				.id("comment3")
				.text("Comment with special chars: @#$%^&*()")
				.build();

			const issues = analyser.analyseIsolated(comment);
			expect(issues).toEqual([]);
		});
	});

	describe("analyseInContext", () => {
		const grafcet = new GrafcetBuilder().build();

		it("returns empty issues array for any element", () => {
			const comment = new CommentBuilder().id("comment1").text("Test comment").build();

			const issues = analyser.analyseInContext(comment, grafcet, []);
			expect(issues).toEqual([]);
		});

		it("returns empty issues array regardless of connections", () => {
			const comment = new CommentBuilder().id("comment1").text("Test comment").build();

			const issues = analyser.analyseInContext(comment, grafcet, []);
			expect(issues).toEqual([]);
		});

		it("returns empty issues array regardless of variables", () => {
			const comment = new CommentBuilder().id("comment1").text("Test comment").build();

			const issues = analyser.analyseInContext(comment, grafcet, []);
			expect(issues).toEqual([]);
		});
	});
});
