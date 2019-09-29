import { buff_class_gun, buff } from "./chess";
import { randInt } from "./helper";

export default [
    {name: "枪手", stage: [2,4,6], buff: set_buff_class_gun},
    {name: "约德尔人", stage: [3, 6]},
    {name: "贵族", stage: [3, 6]},
    {name: "剑士", stage: [3, 6, 9]},
    {name: "浪人", stage: [1], exact: 0},
    {name: "海盗", stage: [3]},
    {name: "恶魔", stage: [2,4,6]},
    {name: "虚空", stage: [2,4], buff: set_buff_class_void},
    {name: "斗士", stage: [2,4,6]},
    {name: "法师", stage: [3,6,9]},
]

export function set_buff_class_gun (vm, camp, stage) {
    let grids = vm.board.grid
    for (let r in grids) {
        for (let c in grids) {
            if (grids[r][c] && grids[r][c].camp === camp && grids[r][c].cat.includes(0)) {
                grids[r][c].buff.push(new buff_class_gun(vm, grids[r][c], stage))
            }
        }
    }
}

export function set_buff_class_void (vm, camp, stage) {
    let grids = vm.board.grids
    let poses = []
    for (let r in grids) {
        for (let c in grids) {
            if (grids[r][c] && grids[r][c].camp === camp && grids[r][c].cat.includes(7)) {
                if (stage === 1) {
                    grids[r][c].buff.push(new buff_class_void(vm, grids[r][c], stage))
                } else if (stage === 0) {
                    poses.push([r,c]) 
                }
            }
        }
    }
    if (stage === 0) {
        let pos = poses[randInt(poses.length)]
        grids[pos[0]][pos[1]].buff.push(new buff_class_void(vm, grids[r][c], stage))
    }
}