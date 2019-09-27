import { buff_class_gun, buff } from "./chess";

export default [
    {name: "枪手", stage: [2,4,6], buff: set_buff_class_gun},
    {name: "约德尔人", stage: [3, 6]},
    {name: "贵族", stage: [3, 6]},
    {name: "剑士", stage: [3, 6, 9]},
    {name: "浪人", stage: [1], exact: 0},
    {name: "海盗", stage: [3]},
    {name: "恶魔", stage: [2,4,6]},
    {name: "虚空", stage: [2,4]},
    {name: "斗士", stage: [2,4,6]},
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