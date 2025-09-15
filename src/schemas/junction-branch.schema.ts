import GrafcetFluxElement from "./grafcet-flux-element.schema"

export default class JunctionBranch {
    id: string = ""
    flux: GrafcetFluxElement[] = []

    position: number = 0
}