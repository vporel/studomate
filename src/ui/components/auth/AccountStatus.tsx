"use client";

import { isSupabaseConfigured } from "@/persistence/repositories/supabase-client";
import {
	getAnonymousPseudo,
	isAnonymousUser,
	useAuthStore,
} from "@/ui/stores/auth/auth.store";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { Box, Button, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import AuthModal from "./AuthModal";
import CloudAccountModal from "./CloudAccountModal";
import { useT } from "@/ui/i18n/useT";

export default function AccountStatus() {
	const { user, loading, init, setAuthModalVisible } = useAuthStore(
		useShallow((state) => ({
			user: state.user,
			loading: state.loading,
			init: state.init,
			setAuthModalVisible: state.setAuthModalVisible,
		})),
	);

	const t = useT("auth.accountStatus");
	const [cloudAccountModalVisible, setCloudAccountModalVisible] =
		useState(false);

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
				onClick={() => setCloudAccountModalVisible(true)}
				endIcon={<AccountCircleIcon fontSize="small" />}
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
			<CloudAccountModal
				open={cloudAccountModalVisible}
				onClose={() => setCloudAccountModalVisible(false)}
			/>
		</Box>
	);
}
