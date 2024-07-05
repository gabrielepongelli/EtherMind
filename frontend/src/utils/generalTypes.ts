export enum Phase {
    START,
    CREATING_MATCH,
    JOINING_MATCH,
    STAKE_DECISION,
    STAKE_PAYMENT,
    GAME_STARTED
}

export interface MatchState {
    phase: Phase; // the phase of the matchmaking
    waiting: boolean // whether the creator is waiting for someone to join
    randomJoin: boolean | undefined // whether a random join is performed or not
    matchID: string | undefined // the match id
    opponent: string | undefined // the address of the opponent
    stakeProposed: bigint | undefined // the stake value being proposed
    proposed: boolean | undefined // whether the stake proposal is coming from you or not
    payed: boolean | undefined // whether the stake has been payed or not
}