export function selectorImplementation<T extends object>(state: T) {
	return (selector: (state: T) => unknown) => selector(state)
}

export function fakeStoreApi<T extends object>(state: T) {
	return {
		getState: () => state,
		setState: (partial: Partial<T>) => Object.assign(state, partial),
		subscribe: jest.fn(() => jest.fn()),
	}
}
