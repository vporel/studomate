
export type GrafcetElementType = "step"|"transition"|"action"|"step-referral"|"junction"

export default class GrafcetElement{
    position: {x: number, y: number} = {x: 0, y: 0}
    width: number = 0
    height: 0 = 0
}