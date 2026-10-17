"use client";

import { useT } from "@/ui/i18n/useT";
import { SchoolType } from "@/user-profile/SchoolType.enum";
import { UserType } from "@/user-profile/UserType.enum";
import normalizeUserProfile, { UserProfile } from "@/user-profile/user-profile";
import { MenuItem, TextField } from "@mui/material";

type Props = {
	value: UserProfile;
	onChange: (profile: UserProfile) => void;
};

export default function UserProfileFields({ value, onChange }: Props) {
	const t = useT("profile");

	return (
		<>
			<TextField
				select
				label={t("fields.userType")}
				value={value.userType ?? ""}
				onChange={(e) =>
					onChange(
						normalizeUserProfile({
							userType: e.target.value,
							schoolType: value.schoolType,
						}),
					)
				}
			>
				<MenuItem value="">{t("fields.notProvided")}</MenuItem>
				{Object.values(UserType).map((userType) => (
					<MenuItem key={userType} value={userType}>
						{t(`userTypes.${userType}`)}
					</MenuItem>
				))}
			</TextField>
			{value.userType === UserType.STUDENT && (
				<TextField
					select
					label={t("fields.schoolType")}
					value={value.schoolType ?? ""}
					onChange={(e) =>
						onChange(
							normalizeUserProfile({
								userType: value.userType,
								schoolType: e.target.value,
							}),
						)
					}
				>
					<MenuItem value="">{t("fields.notProvided")}</MenuItem>
					{Object.values(SchoolType).map((schoolType) => (
						<MenuItem key={schoolType} value={schoolType}>
							{t(`schoolTypes.${schoolType}`)}
						</MenuItem>
					))}
				</TextField>
			)}
		</>
	);
}
