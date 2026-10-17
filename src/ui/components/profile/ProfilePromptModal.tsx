"use client";

import { useT } from "@/ui/i18n/useT";
import trackEvent from "@/ui/services/analytics";
import {
	setStoredUserProfile,
	shouldAskUserProfile,
} from "@/persistence/user-profile.storage";
import { SchoolType } from "@/user-profile/SchoolType.enum";
import { UserType } from "@/user-profile/UserType.enum";
import { EMPTY_USER_PROFILE, UserProfile } from "@/user-profile/user-profile";
import CustomModal from "@/ui/components/mui/CustomModal";
import { Box, Button, Typography } from "@mui/material";
import { useEffect, useState } from "react";

type Step = "userType" | "schoolType";

export default function ProfilePromptModal() {
	const t = useT("profile");
	const [visible, setVisible] = useState(false);
	const [step, setStep] = useState<Step>("userType");

	useEffect(() => {
		setVisible(shouldAskUserProfile());
	}, []);

	if (!visible) return null;

	const submit = (profile: UserProfile) => {
		setStoredUserProfile(profile);
		if (profile.userType) {
			trackEvent("profile", {
				userType: profile.userType,
				...(profile.schoolType && { schoolType: profile.schoolType }),
			});
		}
		setVisible(false);
	};

	const onUserType = (userType: UserType) => {
		if (userType === UserType.STUDENT) setStep("schoolType");
		else submit({ userType, schoolType: null });
	};

	const onSkip = () =>
		submit(
			step === "schoolType"
				? { userType: UserType.STUDENT, schoolType: null }
				: EMPTY_USER_PROFILE,
		);

	return (
		<CustomModal
			open
			onClose={onSkip}
			width={480}
			title={
				step === "userType"
					? t("prompt.userTypeTitle")
					: t("prompt.schoolTypeTitle")
			}
		>
			<Typography variant="body2" color="text.secondary" mb={2}>
				{step === "userType"
					? t("prompt.userTypeHint")
					: t("prompt.schoolTypeQuestion")}
			</Typography>
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
				{step === "userType"
					? Object.values(UserType).map((userType) => (
							<Button
								key={userType}
								variant="outlined"
								size="small"
								onClick={() => onUserType(userType)}
							>
								{t(`userTypes.${userType}`)}
							</Button>
						))
					: Object.values(SchoolType).map((schoolType) => (
							<Button
								key={schoolType}
								variant="outlined"
								size="small"
								onClick={() =>
									submit({ userType: UserType.STUDENT, schoolType })
								}
							>
								{t(`schoolTypes.${schoolType}`)}
							</Button>
						))}
			</Box>
			<Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
				<Button size="small" color="inherit" onClick={onSkip}>
					{t("prompt.skip")}
				</Button>
			</Box>
		</CustomModal>
	);
}
