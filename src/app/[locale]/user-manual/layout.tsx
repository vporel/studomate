import { createGenerateMetadata } from "@/app/metadata";

export const generateMetadata = createGenerateMetadata(
	"/user-manual",
	"manualTitle",
	"manualDescription",
);

export default function UserManualLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
