import { MatchState, Phase } from '../utils/generalTypes';

export const initialMatchState: MatchState = {
    phase: Phase.START,
    waiting: false,
    randomJoin: undefined,
    matchID: undefined,
    stakeProposed: undefined,
    opponent: undefined,
    proposed: undefined
};

export type MatchStateAction =
    | { type: "creating" }
    | { type: "created", waiting: true }
    | { type: "created", waiting: false, matchId: string }
    | { type: "joining", waiting: false, random: boolean }
    | { type: "joining", waiting: true }
    | { type: "started", matchId: string, opponent: string }
    | { type: "stake proposal", waiting: true }
    | { type: "stake proposal", waiting: false, proposed: boolean, amount: bigint }
    | { type: "stake approved", amount: bigint }

export const matchStateReducer = (state: MatchState, action: MatchStateAction): MatchState => {
    switch (action.type) {
        case "creating":
            return {
                ...state,
                phase: Phase.CREATING_MATCH
            };
        case "created":
            if (action.waiting) {
                return { ...state, waiting: true };
            } else {
                return { ...state, waiting: false, matchID: action.matchId };
            }
        case "joining":
            if (action.waiting) {
                return { ...state, waiting: true };
            } else {
                return {
                    ...state,
                    phase: Phase.JOINING_MATCH,
                    randomJoin: action.random,
                    waiting: false
                };
            }
        case "started":
            return {
                ...state,
                phase: Phase.STAKE_DECISION,
                matchID: action.matchId,
                waiting: true,
                opponent: action.opponent,
                proposed: false
            };
        case "stake proposal":
            if (action.waiting) {
                return { ...state, waiting: true };
            } else {
                return {
                    ...state,
                    waiting: false,
                    proposed: action.proposed,
                    stakeProposed: action.amount
                };
            }
        case "stake approved":
            return {
                ...state,
                phase: Phase.STAKE_PAYMENT,
                stakeProposed: action.amount
            };
        default:
            return initialMatchState;
    }
}