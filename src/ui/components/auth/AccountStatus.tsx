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
import { useT } from "@/ui/i18n/useT";
import dynamic from "next/dynamic";

const AuthModal = dynamic(() => import("./AuthModal"), { ssr: false });
const CloudAccountModal = dynamic(() => import("./CloudAccountModal"), {
	ssr: false,
});

export default function AccountStatus() {
	const { user, loading, init, setAuthModalVisible, authModalVisible } =
		useAuthStore(
			useShallow((state) => ({
				user: state.user,
				loading: state.loading,
				init: state.init,
				setAuthModalVisible: state.setAuthModalVisible,
				authModalVisible: state.ui.authModalVisible,
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
					<Button
						size="small"
						startIcon={<AccountCircleIcon fontSize="small" />}
						onClick={() => setAuthModalVisible(true)}
					>
						{t("signIn")}
					</Button>
				</Tooltip>
				{authModalVisible && <AuthModal />}
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
				startIcon={<AccountCircleIcon fontSize="small" />}
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
			{cloudAccountModalVisible && (
				<CloudAccountModal
					open
					onClose={() => setCloudAccountModalVisible(false)}
				/>
			)}
		</Box>
	);
}
