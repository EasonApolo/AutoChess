# chess

## Notes

Chess initialization (add status ready, set _hp) is done in initAllChess() which is called at the round start rather than setChess(), since the game is designed that no more chess setting after round start. Therefore, chesses been set after round start cannot attack or do not have _hp.

## Todos

| 任务 | 优先级 | 完成 |
| ---- | ---- | ---- |
| 棋子合成 | 中 | × |
| 棋子刷新 | 低 | × |
| 装备合成 | 低 | × |
| 装备掉落 | 低 | × |
| 装备buff | 高 | × |
| 羁绊buff | 高 | × |
| 范围（单次/持续）伤害和（单次）buff | 高 | × |
| 伤害类型，护甲/魔抗、无敌、闪避、反弹等效果 | 特别高 | × |
| 回合设置 | 低 | × |
| 多人对战 | 低 | × |

## BugReminder

状态判定应该在 ++ 前面，避免显示上状态未满就结束了。

注意for循环的index是字符串，计算时会变成NaN

注意单次buff生效时先移除buff，否则buff生效时可能又会触发这个buff导致死循环（比如damage）
