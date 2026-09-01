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

export default function StorageLocationRadioGroup({
	value,
	onChange,
}: {
	value: StorageLocation;
	onChange: (location: StorageLocation) => void;
}) {
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
					label="Sur cet appareil"
				/>
				<FormControlLabel value="cloud" control={<Radio />} label="Dans le cloud" />
			</RadioGroup>
			{value === "cloud" && !user && (
				<Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 4 }}>
					<Typography variant="body2" color="text.secondary">
						Connexion requise.
					</Typography>
					<Button
						size="small"
						onClick={() =>
							setAuthModalVisible(
								true,
								"Connectez-vous pour enregistrer dans le cloud.",
							)
						}
					>
						Se connecter
					</Button>
				</Box>
			)}
		</Box>
	);
}
