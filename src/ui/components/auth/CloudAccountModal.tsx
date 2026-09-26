"use client";

import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import { useT } from "@/ui/i18n/useT";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { Box, Button, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useProjectContext } from "@/ui/components/projects/ProjectContext";
import DeleteAccountModal from "./DeleteAccountModal";

interface CloudAccountModalProps {
	open: boolean;
	onClose: () => void;
}

export default function CloudAccountModal({
	open,
	onClose,
}: CloudAccountModalProps) {
	const t = useT("auth.cloudAccount");
	const projectStore = useProjectContext();
	const signOut = useAuthStore((state) => state.signOut);
	const [cloudProjectCount, setCloudProjectCount] = useState<number | null>(
		null,
	);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setCloudProjectCount(null);
		void new HybridProjectRepository().listCloud().then(({ projects }) => {
			if (!cancelled) setCloudProjectCount(projects.length);
		});
		return () => {
			cancelled = true;
		};
	}, [open]);

	const handleOpenProject = useCallback(() => {
		onClose();
		projectStore?.getState().setOpenModalVisible(true);
	}, [onClose, projectStore]);

	const handleSignOut = useCallback(() => {
		onClose();
		void signOut();
	}, [onClose, signOut]);

	return (
		<>
			<CustomModal open={open} onClose={onClose} title={t("title")} width={480}>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 2,
						}}
					>
						<Typography>
							{cloudProjectCount === null
								? t("projectCountLoading")
								: t("projectCount", { count: cloudProjectCount })}
						</Typography>
						{projectStore && (
							<Button variant="outlined" onClick={handleOpenProject}>
								{t("openProject")}
							</Button>
						)}
					</Box>

					<Box
						sx={{
							border: 1,
							borderColor: "error.main",
							borderRadius: 1,
							p: 2,
							display: "flex",
							justifyContent: "space-between",
						}}
					>
						<Button
							variant="outlined"
							color="error"
							onClick={() => setDeleteModalVisible(true)}
						>
							{t("deleteAccount")}
						</Button>
						<Button variant="outlined" onClick={handleSignOut}>
							{t("signOut")}
						</Button>
					</Box>
				</Box>
			</CustomModal>
			<DeleteAccountModal
				open={open && deleteModalVisible}
				cloudProjectCount={cloudProjectCount ?? 0}
				onClose={() => setDeleteModalVisible(false)}
			/>
		</>
	);
}
