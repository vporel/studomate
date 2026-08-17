"use client";

import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { KeyboardArrowDown as ArrowDownIcon } from "@mui/icons-material";
import { Box, Button, Menu, MenuItem, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import AuthModal from "./AuthModal";

export default function AccountStatus() {
	const { user, loading, init, signOut, setAuthModalVisible } = useAuthStore(
		useShallow((state) => ({
			user: state.user,
			loading: state.loading,
			init: state.init,
			signOut: state.signOut,
			setAuthModalVisible: state.setAuthModalVisible,
		})),
	);

	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

	useEffect(() => {
		void init();
	}, [init]);

	if (loading) return null;

	if (!user) {
		return (
			<Box>
				<Button size="small" onClick={() => setAuthModalVisible(true)}>
					Se connecter
				</Button>
				<AuthModal />
			</Box>
		);
	}

	return (
		<Box>
			<Button
				size="small"
				color="inherit"
				onClick={(e) => setAnchorEl(e.currentTarget)}
				endIcon={<ArrowDownIcon fontSize="small" />}
				sx={{ textTransform: "none" }}
			>
				<Typography fontSize="0.85rem" color="text.secondary" noWrap maxWidth={180}>
					{user.email}
				</Typography>
			</Button>
			<Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
				<MenuItem
					onClick={() => {
						setAnchorEl(null);
						void signOut();
					}}
				>
					Se déconnecter
				</MenuItem>
			</Menu>
		</Box>
	);
}
