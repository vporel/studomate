import GrafcetElement, { GrafcetElementDimensions, GrafcetElementPosition } from "./grafcet-element.schema"

export type JunctionType = "or-start"|"or-end"|"and-start"|"and-end"

export default class Junction extends GrafcetElement{
    id: string = ""
    type: JunctionType = "or-start"
    pivotPosition: number = 0
    branchesPositions: number[] = []

    constructor(id: string, type: JunctionType, pivotPosition: number, branchesPositions: number[], position: GrafcetElementPosition, dimensions: GrafcetElementDimensions){
        super(position, dimensions)
        this.id = id
        this.type = type
        this.pivotPosition = pivotPosition
        this.branchesPositions = branchesPositions
    }
}