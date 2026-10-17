"use client";

import { useT } from "@/ui/i18n/useT";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Box, IconButton, alpha, styled } from "@mui/material";
import { useEffect, useRef, useState } from "react";

const WIDTH = 1152;
const HEIGHT = 720;

const Video = styled("video")(({ theme }) => ({
	display: "block",
	width: "100%",
	height: "auto",
	aspectRatio: `${WIDTH} / ${HEIGHT}`,
	borderRadius: Number(theme.shape.borderRadius) * 2,
	border: `1px solid ${theme.palette.divider}`,
	boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
	background: theme.palette.grey[100],
}));

const prefersReducedMotion = () =>
	window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Muted looping demo: starts on its own unless the visitor asks for reduced motion, and always
 * exposes a pause button (WCAG 2.2.2: moving content longer than 5 s must be pausable).
 */
const DemoVideo = ({ src, label }: { src: string; label: string }) => {
	const t = useT("public.landing");
	const videoRef = useRef<HTMLVideoElement>(null);
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		if (prefersReducedMotion()) return;
		videoRef.current?.play().catch(() => {});
	}, []);

	const toggle = () => {
		const video = videoRef.current;
		if (!video) return;
		if (playing) video.pause();
		else video.play().catch(() => {});
	};

	return (
		<Box sx={{ position: "relative", width: "100%", maxWidth: 960 }}>
			<Video
				ref={videoRef}
				muted
				loop
				playsInline
				preload="metadata"
				width={WIDTH}
				height={HEIGHT}
				aria-label={label}
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
			>
				<source src={src} type="video/mp4" />
			</Video>
			<IconButton
				onClick={toggle}
				aria-label={t(playing ? "demoVideoPause" : "demoVideoPlay")}
				size="small"
				sx={{
					position: "absolute",
					right: 12,
					bottom: 12,
					color: "common.white",
					background: (th) => alpha(th.palette.common.black, 0.6),
					"&:hover": {
						background: (th) => alpha(th.palette.common.black, 0.75),
					},
				}}
			>
				{playing ? <PauseIcon /> : <PlayArrowIcon />}
			</IconButton>
		</Box>
	);
};

export default DemoVideo;
