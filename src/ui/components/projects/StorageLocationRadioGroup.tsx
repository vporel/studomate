"use client";

import { StorageLocation } from "@/persistence/repositories/project.repository";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import {
	Box,
	Button,
	FormControlLabel,
	Radio,
	RadioGroup,
	Typography,
} from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useT } from "@/ui/i18n/useT";

export default function StorageLocationRadioGroup({
	value,
	onChange,
}: {
	value: StorageLocation;
	onChange: (location: StorageLocation) => void;
}) {
	const t = useT("projects.storageLocation");
	const tc = useT("projects.common");
	const { user, setAuthModalVisible } = useAuthStore(
		useShallow((s) => ({
			user: s.user,
			setAuthModalVisible: s.setAuthModalVisible,
		})),
	);

	return (
		<Box>
			<RadioGroup
				value={value}
				onChange={(e) => onChange(e.target.value as StorageLocation)}
			>
				<FormControlLabel
					value="local"
					control={<Radio />}
					label={t("onThisDevice")}
				/>
				<FormControlLabel value="cloud" control={<Radio />} label={t("inTheCloud")} />
			</RadioGroup>
			{value === "cloud" && !user && (
				<Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 4 }}>
					<Typography variant="body2" color="text.secondary">
						{t("loginRequired")}
					</Typography>
					<Button
						size="small"
						onClick={() =>
							setAuthModalVisible(
								true,
								t("loginToSaveCloud"),
							)
						}
					>
						{tc("login")}
					</Button>
				</Box>
			)}
		</Box>
	);
}
