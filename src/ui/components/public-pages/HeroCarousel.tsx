"use client";

import { useT } from "@/ui/i18n/useT";
import { Box, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useCallback, useEffect, useState } from "react";

export type HeroSlide = { src: string; alt: string };

const AUTOPLAY_MS = 6000;

const HeroCarousel = ({ slides }: { slides: HeroSlide[] }) => {
	const t = useT("public.landing");
	const [index, setIndex] = useState(0);
	const [paused, setPaused] = useState(false);

	const go = useCallback(
		(next: number) => setIndex((next + slides.length) % slides.length),
		[slides.length],
	);

	useEffect(() => {
		if (paused || slides.length < 2) return;
		const id = setInterval(
			() => setIndex((i) => (i + 1) % slides.length),
			AUTOPLAY_MS,
		);
		return () => clearInterval(id);
	}, [paused, slides.length]);

	return (
		<Box
			aria-roledescription="carrousel"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			sx={{
				position: "relative",
				width: "100%",
				maxWidth: 960,
				aspectRatio: "1.885 / 1",
				borderRadius: 2,
				overflow: "hidden",
				border: "1px solid",
				borderColor: "divider",
				boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
				background: "#fff",
			}}
		>
			{slides.map((slide, i) => (
				<Box
					key={slide.src}
					component="img"
					src={slide.src}
					alt={slide.alt}
					aria-hidden={i !== index}
					sx={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						objectFit: "cover",
						objectPosition: "top",
						transition: "opacity 0.6s ease",
						opacity: i === index ? 1 : 0,
					}}
				/>
			))}

			{slides.length > 1 && (
				<>
					<IconButton
						aria-label={t("heroPrev")}
						onClick={() => go(index - 1)}
						sx={{
							position: "absolute",
							top: "50%",
							left: 8,
							transform: "translateY(-50%)",
							bgcolor: "rgba(255,255,255,0.8)",
							"&:hover": { bgcolor: "rgba(255,255,255,0.95)" },
						}}
					>
						<ChevronLeftIcon />
					</IconButton>
					<IconButton
						aria-label={t("heroNext")}
						onClick={() => go(index + 1)}
						sx={{
							position: "absolute",
							top: "50%",
							right: 8,
							transform: "translateY(-50%)",
							bgcolor: "rgba(255,255,255,0.8)",
							"&:hover": { bgcolor: "rgba(255,255,255,0.95)" },
						}}
					>
						<ChevronRightIcon />
					</IconButton>

					<Box
						sx={{
							position: "absolute",
							bottom: 12,
							left: 0,
							right: 0,
							display: "flex",
							justifyContent: "center",
							gap: 1,
						}}
					>
						{slides.map((slide, i) => (
							<Box
								key={slide.src}
								component="button"
								aria-label={t("heroGoTo", { number: i + 1 })}
								aria-current={i === index}
								onClick={() => setIndex(i)}
								sx={{
									width: 10,
									height: 10,
									p: 0,
									borderRadius: "50%",
									border: "none",
									cursor: "pointer",
									bgcolor:
										i === index ? "primary.main" : "rgba(0,0,0,0.3)",
								}}
							/>
						))}
					</Box>
				</>
			)}
		</Box>
	);
};

export default HeroCarousel;
