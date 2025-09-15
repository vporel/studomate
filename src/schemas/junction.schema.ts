import GrafcetElement from "./grafcet-element.schema"
import JunctionBranch from "./junction-branch.schema"

export type JunctionType = "or"|"and"

export default class Junction extends GrafcetElement{
    id: string = ""
    type: JunctionType = "or"
    branches: JunctionBranch[] = []

    pivotPosition: number = 0
}