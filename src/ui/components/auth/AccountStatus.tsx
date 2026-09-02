"use client";

import { isSupabaseConfigured } from "@/persistence/repositories/supabase-client";
import {
	getAnonymousPseudo,
	isAnonymousUser,
	useAuthStore,
} from "@/ui/stores/auth/auth.store";
import ArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
	Box,
	Button,
	Menu,
	MenuItem,
	Tooltip,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import AuthModal from "./AuthModal";
import { useT } from "@/ui/i18n/useT";

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

	const t = useT("auth.accountStatus");
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

	useEffect(() => {
		if (isSupabaseConfigured) void init();
	}, [init]);

	if (!isSupabaseConfigured || loading) return null;

	if (!user) {
		return (
			<Box>
				<Tooltip title={t("tooltip")}>
					<Button size="small" onClick={() => setAuthModalVisible(true)}>
						{t("signIn")}
					</Button>
				</Tooltip>
				<AuthModal />
			</Box>
		);
	}

	const displayName = isAnonymousUser(user)
		? getAnonymousPseudo(user)
		: user.email;

	return (
		<Box>
			<Button
				size="small"
				color="inherit"
				onClick={(e) => setAnchorEl(e.currentTarget)}
				endIcon={<ArrowDownIcon fontSize="small" />}
				sx={{ textTransform: "none" }}
			>
				<Typography
					fontSize="0.85rem"
					color="text.secondary"
					noWrap
					maxWidth={180}
				>
					{displayName}
				</Typography>
			</Button>
			<Menu
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={() => setAnchorEl(null)}
			>
				<MenuItem
					onClick={() => {
						setAnchorEl(null);
						void signOut();
					}}
				>
					{t("signOut")}
				</MenuItem>
			</Menu>
		</Box>
	);
}
