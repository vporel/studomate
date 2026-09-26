import { SchoolType } from "./SchoolType.enum";
import { UserType } from "./UserType.enum";

/** Self-declared profile. `null` means "not provided". */
export type UserProfile = {
	userType: UserType | null;
	/** Only meaningful when `userType` is `STUDENT`. */
	schoolType: SchoolType | null;
};

export const EMPTY_USER_PROFILE: UserProfile = {
	userType: null,
	schoolType: null,
};

const USER_TYPES: string[] = Object.values(UserType);
const SCHOOL_TYPES: string[] = Object.values(SchoolType);

/**
 * Builds a valid profile from untrusted data (localStorage, form state): unknown values become
 * `null`, and `schoolType` is dropped unless the user is a student.
 */
export default function normalizeUserProfile(raw: unknown): UserProfile {
	const { userType, schoolType } = (raw ?? {}) as Record<string, unknown>;
	if (typeof userType !== "string" || !USER_TYPES.includes(userType)) {
		return EMPTY_USER_PROFILE;
	}
	const isStudent = userType === UserType.STUDENT;
	return {
		userType: userType as UserType,
		schoolType:
			isStudent &&
			typeof schoolType === "string" &&
			SCHOOL_TYPES.includes(schoolType)
				? (schoolType as SchoolType)
				: null,
	};
}
