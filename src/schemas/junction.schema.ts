import GrafcetElement from "./grafcet-element.schema"

export type JunctionType = "or-start"|"or-end"|"and-start"|"and-end"

export default class Junction extends GrafcetElement{
    id: string = ""
    type: JunctionType = "or-start"
    branchesPositions: number[] = []
    pivotPosition: number = 0
}