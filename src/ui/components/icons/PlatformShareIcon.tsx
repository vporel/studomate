"use client";

import { isIos } from "@/ui/lib/platform";
import IosShareIcon from "@mui/icons-material/IosShare";
import ShareIcon from "@mui/icons-material/Share";
import type { SvgIconProps } from "@mui/material";
import { useEffect, useState } from "react";

/** The share icon of the user's platform: the Apple one on macOS and iOS, the usual one elsewhere. */
export default function PlatformShareIcon(props: SvgIconProps) {
	const [apple, setApple] = useState(false);
	useEffect(() => setApple(isIos()), []);
	return apple ? <IosShareIcon {...props} /> : <ShareIcon {...props} />;
}
