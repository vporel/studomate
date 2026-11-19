"use client";

import { isContactTopic } from "@/contact/contact-message";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ContactForm from "./ContactForm";

export const CONTACT_TOPIC_PARAM = "topic";

function FormWithTopicFromUrl() {
	const topic = useSearchParams().get(CONTACT_TOPIC_PARAM);
	return <ContactForm initialTopic={isContactTopic(topic) ? topic : null} />;
}

/**
 * Contact form preset by `?topic=` (one of `CONTACT_TOPICS`, anything else is ignored). The
 * statically rendered page shows the form without a topic until the query string is read.
 */
export default function ContactFormFromUrl() {
	return (
		<Suspense fallback={<ContactForm initialTopic={null} />}>
			<FormWithTopicFromUrl />
		</Suspense>
	);
}
