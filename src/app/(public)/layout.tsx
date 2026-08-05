import Footer from "@/ui/components/public-pages/Footer";
import Header from "@/ui/components/public-pages/Header";
import { Fragment } from "react";

export default function PublicPagesLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<Fragment>
			<Header />
			<main>{children}</main>
			<Footer />
		</Fragment>
	);
}
