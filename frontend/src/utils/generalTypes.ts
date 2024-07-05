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
    randomJoin?: boolean // whether a random join is performed or not
    matchID?: string // the match id
    opponent?: string // the address of the opponent
    stakeProposed?: string | bigint // the stake value being proposed
    proposed: boolean // whether the stake proposal is coming from you or not
    payed: boolean // whether the stake has been payed or not
    error: string | undefined // the error message
}