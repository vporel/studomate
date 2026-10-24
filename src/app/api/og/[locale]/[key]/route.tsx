import { APP_URL } from "@/app-info";
import { THEME_COLOR } from "@/app/root-metadata";
import { OG_IMAGE_KEYS, OG_IMAGE_SIZE, type OgImageKey } from "@/app/og-image";
import { LOCALES, type Locale } from "@/i18n/config";
import ogTitle from "@/app/og-title";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = { locale: string; key: string };

export function generateStaticParams(): Params[] {
	return LOCALES.flatMap((locale) =>
		OG_IMAGE_KEYS.map((key) => ({ locale, key })),
	);
}

const isLocale = (value: string): value is Locale =>
	(LOCALES as readonly string[]).includes(value);

const isKey = (value: string): value is OgImageKey =>
	(OG_IMAGE_KEYS as readonly string[]).includes(value);

export async function GET(
	_request: Request,
	{ params }: { params: Promise<Params> },
) {
	const { locale, key } = await params;
	if (!isLocale(locale) || !isKey(key)) {
		return new Response("Not found", { status: 404 });
	}

	const logo = await readFile(
		path.join(process.cwd(), "public/images/logo.png"),
	);
	const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
	const title = ogTitle(locale, key);

	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					padding: 72,
					background: THEME_COLOR,
					color: "white",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 24 }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: 112,
							height: 112,
							borderRadius: 24,
							background: "white",
						}}
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={logoSrc} width={80} height={78} alt="" />
					</div>
					<div style={{ fontSize: 48, fontWeight: 700 }}>Studomate</div>
				</div>
				<div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.15 }}>
					{title}
				</div>
				<div style={{ fontSize: 32, opacity: 0.85 }}>
					{new URL(APP_URL).host}
				</div>
			</div>
		),
		OG_IMAGE_SIZE,
	);
}
