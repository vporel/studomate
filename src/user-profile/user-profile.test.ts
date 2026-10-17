import normalizeUserProfile from "./user-profile";
import { SchoolType } from "./SchoolType.enum";
import { UserType } from "./UserType.enum";

describe("normalizeUserProfile", () => {
	it("keeps a valid teacher profile", () => {
		expect(normalizeUserProfile({ userType: "teacher", schoolType: null })).toEqual({
			userType: UserType.TEACHER,
			schoolType: null,
		});
	});

	it("keeps the school type of a student", () => {
		expect(
			normalizeUserProfile({ userType: "student", schoolType: "bts" }),
		).toEqual({ userType: UserType.STUDENT, schoolType: SchoolType.BTS });
	});

	it("accepts a student without school type", () => {
		expect(normalizeUserProfile({ userType: "student" })).toEqual({
			userType: UserType.STUDENT,
			schoolType: null,
		});
	});

	it("drops the school type when the user is not a student", () => {
		expect(
			normalizeUserProfile({ userType: "teacher", schoolType: "bts" }),
		).toEqual({ userType: UserType.TEACHER, schoolType: null });
	});

	it("drops an unknown school type of a student", () => {
		expect(
			normalizeUserProfile({ userType: "student", schoolType: "kindergarten" }),
		).toEqual({ userType: UserType.STUDENT, schoolType: null });
	});

	it("returns the empty profile for an unknown user type", () => {
		expect(
			normalizeUserProfile({ userType: "wizard", schoolType: "bts" }),
		).toEqual({ userType: null, schoolType: null });
	});

	it.each([null, undefined, "student", 42, []])(
		"returns the empty profile for a non-object input (%p)",
		(raw) => {
			expect(normalizeUserProfile(raw)).toEqual({
				userType: null,
				schoolType: null,
			});
		},
	);
});
