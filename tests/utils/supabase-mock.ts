/** Mock functions shared by the mocked Supabase client and the tests that import this module. */
export const supabaseMocks = {
	authGetUser: jest.fn(),
	getSession: jest.fn(),
	onAuthStateChange: jest.fn((..._args: any[]) => ({
		data: { subscription: { unsubscribe: jest.fn() } },
	})),
	signUp: jest.fn(),
	signInWithPassword: jest.fn(),
	signOut: jest.fn(),
	resetPasswordForEmail: jest.fn(),
	from: jest.fn(),
	rpc: jest.fn(),
};

/** Module shape of `supabase-client`, wired to `supabaseMocks`. Call it from a `jest.mock` factory. */
export function createSupabaseMock() {
	return {
		supabase: {
			auth: {
				getUser: supabaseMocks.authGetUser,
				getSession: supabaseMocks.getSession,
				onAuthStateChange: supabaseMocks.onAuthStateChange,
				signUp: supabaseMocks.signUp,
				signInWithPassword: supabaseMocks.signInWithPassword,
				signOut: supabaseMocks.signOut,
				resetPasswordForEmail: supabaseMocks.resetPasswordForEmail,
			},
			from: supabaseMocks.from,
			rpc: supabaseMocks.rpc,
		},
	};
}
