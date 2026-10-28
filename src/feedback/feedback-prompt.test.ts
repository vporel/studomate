import {
	EMPTY_FEEDBACK_PROMPT_STATE,
	FeedbackPromptState,
	isFeedbackPromptDue,
	localDayKey,
	markAnswered,
	normalizeFeedbackPromptState,
	postpone,
	recordMilestone,
	recordVisit,
} from "./feedback-prompt";

const state = (
	patch: Partial<FeedbackPromptState> = {},
): FeedbackPromptState => ({
	...EMPTY_FEEDBACK_PROMPT_STATE,
	...patch,
});

describe("normalizeFeedbackPromptState", () => {
	it("returns the empty state for anything that is not an object", () => {
		expect(normalizeFeedbackPromptState(undefined)).toEqual(
			EMPTY_FEEDBACK_PROMPT_STATE,
		);
		expect(normalizeFeedbackPromptState(null)).toEqual(
			EMPTY_FEEDBACK_PROMPT_STATE,
		);
		expect(normalizeFeedbackPromptState("x")).toEqual(
			EMPTY_FEEDBACK_PROMPT_STATE,
		);
	});

	it("keeps valid fields and resets invalid ones", () => {
		expect(
			normalizeFeedbackPromptState({
				hasContent: true,
				hasSimulatedOrExported: "yes",
				visitCount: 4,
				lastVisitDay: "2026-10-28",
				dismissCount: -1,
				dismissedAtVisitCount: 1.5,
				answered: true,
			}),
		).toEqual(
			state({
				hasContent: true,
				visitCount: 4,
				lastVisitDay: "2026-10-28",
				answered: true,
			}),
		);
	});
});

describe("localDayKey", () => {
	it("formats the local calendar day with zero padding", () => {
		expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
		expect(localDayKey(new Date(2026, 9, 28, 0, 1))).toBe("2026-10-28");
	});
});

describe("recordVisit", () => {
	it("counts a new day once", () => {
		const first = recordVisit(state(), "2026-10-28");
		expect(first).toMatchObject({ visitCount: 1, lastVisitDay: "2026-10-28" });
		expect(recordVisit(first, "2026-10-28")).toBe(first);
	});

	it("counts each distinct day", () => {
		const next = recordVisit(recordVisit(state(), "2026-10-28"), "2026-10-29");
		expect(next.visitCount).toBe(2);
	});
});

describe("recordMilestone", () => {
	it("a created program is content", () => {
		expect(recordMilestone(state(), "program-created")).toMatchObject({
			hasContent: true,
			hasSimulatedOrExported: false,
		});
	});

	it.each(["simulation-ended", "pdf-exported"] as const)(
		"%s counts as simulated or exported",
		(milestone) => {
			expect(recordMilestone(state(), milestone)).toMatchObject({
				hasContent: false,
				hasSimulatedOrExported: true,
			});
		},
	);

	it("returns the same state when nothing changes", () => {
		const s = state({ hasContent: true, hasSimulatedOrExported: true });
		expect(recordMilestone(s, "program-created")).toBe(s);
		expect(recordMilestone(s, "pdf-exported")).toBe(s);
	});
});

describe("isFeedbackPromptDue", () => {
	it("is not due for a new user", () => {
		expect(isFeedbackPromptDue(state())).toBe(false);
	});

	it("is due once content exists and the app was simulated or exported", () => {
		expect(
			isFeedbackPromptDue(
				state({ hasContent: true, hasSimulatedOrExported: true }),
			),
		).toBe(true);
	});

	it("is not due with only one half of the checklist", () => {
		expect(isFeedbackPromptDue(state({ hasContent: true }))).toBe(false);
		expect(isFeedbackPromptDue(state({ hasSimulatedOrExported: true }))).toBe(
			false,
		);
	});

	it("is due from the third visit even without activity", () => {
		expect(isFeedbackPromptDue(state({ visitCount: 2 }))).toBe(false);
		expect(isFeedbackPromptDue(state({ visitCount: 3 }))).toBe(true);
	});

	it("is never due once answered", () => {
		expect(isFeedbackPromptDue(state({ visitCount: 20, answered: true }))).toBe(
			false,
		);
	});

	describe("after one postponement", () => {
		const postponed = (visitCount: number, atVisit: number) =>
			state({
				hasContent: true,
				hasSimulatedOrExported: true,
				visitCount,
				dismissCount: 1,
				dismissedAtVisitCount: atVisit,
			});

		it("waits for the tenth visit", () => {
			expect(isFeedbackPromptDue(postponed(9, 2))).toBe(false);
			expect(isFeedbackPromptDue(postponed(10, 2))).toBe(true);
		});

		it("needs a visit later than the one that postponed it", () => {
			expect(isFeedbackPromptDue(postponed(12, 12))).toBe(false);
			expect(isFeedbackPromptDue(postponed(13, 12))).toBe(true);
		});
	});

	it("is not due after the reminder was postponed too", () => {
		expect(
			isFeedbackPromptDue(state({ visitCount: 40, dismissCount: 2 })),
		).toBe(false);
	});
});

describe("postpone and markAnswered", () => {
	it("postpone remembers the visit it happened at", () => {
		expect(postpone(state({ visitCount: 3 }))).toMatchObject({
			dismissCount: 1,
			dismissedAtVisitCount: 3,
		});
	});

	it("markAnswered flags the state", () => {
		expect(markAnswered(state()).answered).toBe(true);
	});
});
