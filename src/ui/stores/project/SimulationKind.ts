/**
 * What a running simulation is made of: `virtual` (local PLC, virtual inputs), `hardware-io`
 * (local PLC, the pins of a linked board as inputs and outputs), `observation` (the program of a
 * linked board, observed).
 */
export type SimulationKind = "virtual" | "hardware-io" | "observation";
