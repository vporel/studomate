import Footer from "@/components/other-pages/Footer";
import Header from "@/components/other-pages/Header";
import { Fragment } from "react";

export default function OtherPagesLayout({
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
