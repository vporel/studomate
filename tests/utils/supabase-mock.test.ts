import {
	createSupabaseMock,
	supabaseMocks,
} from "@tests/utils/supabase-mock";

describe("createSupabaseMock", () => {
	it("wires the client to the shared mock functions", () => {
		const { supabase } = createSupabaseMock();

		expect(supabase.auth.getUser).toBe(supabaseMocks.authGetUser);
		expect(supabase.auth.getSession).toBe(supabaseMocks.getSession);
		expect(supabase.auth.onAuthStateChange).toBe(
			supabaseMocks.onAuthStateChange,
		);
		expect(supabase.auth.signUp).toBe(supabaseMocks.signUp);
		expect(supabase.auth.signInWithPassword).toBe(
			supabaseMocks.signInWithPassword,
		);
		expect(supabase.auth.signOut).toBe(supabaseMocks.signOut);
		expect(supabase.auth.resetPasswordForEmail).toBe(
			supabaseMocks.resetPasswordForEmail,
		);
		expect(supabase.from).toBe(supabaseMocks.from);
		expect(supabase.rpc).toBe(supabaseMocks.rpc);
	});

	it("returns a subscription from onAuthStateChange by default", () => {
		const { supabase } = createSupabaseMock();
		const result = supabase.auth.onAuthStateChange(() => {});

		expect(result.data.subscription.unsubscribe).toEqual(expect.any(Function));
	});

	it("lets tests drive the client through the shared mocks", async () => {
		const { supabase } = createSupabaseMock();
		supabaseMocks.getSession.mockResolvedValueOnce({ data: { session: null } });

		await expect(supabase.auth.getSession()).resolves.toEqual({
			data: { session: null },
		});
	});
});
