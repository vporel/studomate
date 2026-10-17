import { SchoolType } from "@/user-profile/SchoolType.enum";
import { UserType } from "@/user-profile/UserType.enum";
import {
	getStoredUserProfile,
	setStoredUserProfile,
	shouldAskUserProfile,
} from "./user-profile.storage";

const mockGetShareToken = jest.fn();
jest.mock("@/ui/stores/project/url/project-url", () => ({
	getShareTokenFromUrl: () => mockGetShareToken(),
}));

function installLocalStorage() {
	const store = new Map<string, string>();
	(globalThis as any).localStorage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => store.set(k, v),
	};
	return store;
}

describe("user-profile.storage", () => {
	let store: Map<string, string>;

	beforeEach(() => {
		store = installLocalStorage();
		mockGetShareToken.mockReturnValue(null);
	});

	afterEach(() => {
		delete (globalThis as any).localStorage;
	});

	describe("getStoredUserProfile", () => {
		it("returns null when nothing is stored", () => {
			expect(getStoredUserProfile()).toBeNull();
		});

		it("round-trips a student profile", () => {
			const profile = {
				userType: UserType.STUDENT,
				schoolType: SchoolType.IUT,
			};
			setStoredUserProfile(profile);
			expect(getStoredUserProfile()).toEqual(profile);
		});

		it("round-trips an empty profile as 'asked, not answered'", () => {
			setStoredUserProfile({ userType: null, schoolType: null });
			expect(getStoredUserProfile()).toEqual({
				userType: null,
				schoolType: null,
			});
		});

		it("sanitises a tampered value instead of trusting it", () => {
			store.set(
				"studomate_user_profile",
				JSON.stringify({ userType: "teacher", schoolType: "bts" }),
			);
			expect(getStoredUserProfile()).toEqual({
				userType: UserType.TEACHER,
				schoolType: null,
			});
		});

		it("returns null on corrupted JSON", () => {
			store.set("studomate_user_profile", "{oops");
			expect(getStoredUserProfile()).toBeNull();
		});

		it("returns null when localStorage is unavailable", () => {
			delete (globalThis as any).localStorage;
			expect(getStoredUserProfile()).toBeNull();
			expect(() =>
				setStoredUserProfile({ userType: null, schoolType: null }),
			).not.toThrow();
		});
	});

	describe("shouldAskUserProfile", () => {
		it("asks on the first visit", () => {
			expect(shouldAskUserProfile()).toBe(true);
		});

		it("does not ask when the user opens a shared link", () => {
			mockGetShareToken.mockReturnValue("abc");
			expect(shouldAskUserProfile()).toBe(false);
		});

		it("asks again on a later visit without share link after having been skipped for one", () => {
			mockGetShareToken.mockReturnValue("abc");
			expect(shouldAskUserProfile()).toBe(false);
			mockGetShareToken.mockReturnValue(null);
			expect(shouldAskUserProfile()).toBe(true);
		});

		it("does not ask again once answered", () => {
			setStoredUserProfile({ userType: UserType.TEACHER, schoolType: null });
			expect(shouldAskUserProfile()).toBe(false);
		});

		it("does not ask again once skipped", () => {
			setStoredUserProfile({ userType: null, schoolType: null });
			expect(shouldAskUserProfile()).toBe(false);
		});
	});
});
