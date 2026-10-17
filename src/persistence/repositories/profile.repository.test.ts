const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock("./supabase-client", () => ({
	supabase: {
		auth: { getUser: (...args: any[]) => mockAuthGetUser(...args) },
		from: (...args: any[]) => mockFrom(...args),
	},
}));

import { SchoolType } from "@/user-profile/SchoolType.enum";
import { UserType } from "@/user-profile/UserType.enum";
import ProfileRepository from "./profile.repository";

describe("ProfileRepository", () => {
	beforeEach(() => {
		mockAuthGetUser.mockReset();
		mockFrom.mockReset();
	});

	it("writes nothing without a signed-in user", async () => {
		mockAuthGetUser.mockResolvedValue({ data: { user: null } });

		await new ProfileRepository().save({
			userType: UserType.TEACHER,
			schoolType: null,
		});

		expect(mockFrom).not.toHaveBeenCalled();
	});

	it("upserts the profile of the signed-in user", async () => {
		mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
		const upsert = jest.fn().mockResolvedValue({ error: null });
		mockFrom.mockReturnValue({ upsert });

		await new ProfileRepository().save({
			userType: UserType.STUDENT,
			schoolType: SchoolType.BTS,
		});

		expect(mockFrom).toHaveBeenCalledWith("profiles");
		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				user_id: "u1",
				user_type: "student",
				school_type: "bts",
			}),
		);
	});

	it("stores nulls for a profile left blank", async () => {
		mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
		const upsert = jest.fn().mockResolvedValue({ error: null });
		mockFrom.mockReturnValue({ upsert });

		await new ProfileRepository().save({ userType: null, schoolType: null });

		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({ user_type: null, school_type: null }),
		);
	});
});
