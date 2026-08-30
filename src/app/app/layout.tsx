import MobileGuard from "@/ui/components/MobileGuard";

export default function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<MobileGuard>
			<div id="boot-splash" aria-hidden="true" />
			{children}
		</MobileGuard>
	);
}
