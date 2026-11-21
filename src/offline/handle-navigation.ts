export type NetworkOutcome =
	| { kind: "page"; response: Response }
	| { kind: "passthrough"; response: Response }
	| { kind: "unusable" };

export default async function handleNavigation(
	pathname: string,
	fetchFromNetwork: () => Promise<NetworkOutcome>,
	matchPrecache: (pathname: string) => Promise<Response | undefined>,
	timeoutMs: number,
): Promise<Response> {
	const network = fetchFromNetwork();
	const timedOut = Symbol("timeout");
	const first = await Promise.race([
		network,
		new Promise<typeof timedOut>((resolve) =>
			setTimeout(() => resolve(timedOut), timeoutMs),
		),
	]);
	if (first !== timedOut && first.kind !== "unusable") return first.response;

	const cached = await matchPrecache(pathname);
	if (cached) return cached;
	const outcome = await network;
	return outcome.kind === "unusable" ? Response.error() : outcome.response;
}
