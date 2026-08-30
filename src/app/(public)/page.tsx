import { APP_NAME, APP_SHORT_DESCRIPTION } from "@/app-info";
import LandingPage from "@/ui/components/public-pages/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: `${APP_NAME} — Créer, Simuler, Automatiser`,
	description: APP_SHORT_DESCRIPTION,
};

export default function Home() {
	return <LandingPage />;
}
