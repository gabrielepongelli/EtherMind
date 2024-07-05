export enum Phase {
    START,
    CREATING_MATCH,
    JOINING_MATCH
}

export interface MatchState {
    phase: Phase; // the phase of the matchmaking
    waitingForJoin: boolean | undefined // whether the creator is waiting for someone to join
    randomJoin: boolean | undefined; // whether a random join is performed or not
    matchID: string | undefined; // the match id
}