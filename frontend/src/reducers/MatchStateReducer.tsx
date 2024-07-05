import { MatchState, Phase } from '../utils/generalTypes';

export const initialMatchState: MatchState = {
    phase: Phase.START,
    waitingForJoin: undefined,
    randomJoin: undefined,
    matchID: undefined
};

export type MatchStateAction =
    | { type: "creating" }
    | { type: "created", waiting: true }
    | { type: "created", waiting: false, matchId: string }
    | { type: "joining", random: boolean }

export const matchStateReducer = (state: MatchState, action: MatchStateAction): MatchState => {
    switch (action.type) {
        case "creating":
            return {
                ...state,
                waitingForJoin: false,
                phase: Phase.CREATING_MATCH
            };
        case "created":
            if (action.waiting) {
                return { ...state, waitingForJoin: true };
            } else {
                return { ...state, matchID: action.matchId };
            }
        case "joining":
            return {
                ...state,
                phase: Phase.JOINING_MATCH,
                randomJoin: action.random
            };
    }
}