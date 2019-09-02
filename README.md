# chess

## Notes

Chess initialization (add status ready, set _hp) is done in initAllChess() which is called at the round start rather than setChess(), since the game is designed that no more chess setting after round start. Therefore, chesses been set after round start cannot attack or do not have _hp.
