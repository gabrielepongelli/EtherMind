import { MatchState, Phase } from '../utils/generalTypes';

export const initialMatchState: MatchState = {
    phase: Phase.START,
    waiting: false,
    randomJoin: undefined,
    matchID: undefined,
    stakeProposed: undefined,
    opponent: undefined,
    proposed: false,
    payed: false,
    error: undefined
};

export type MatchStateAction =
    | { type: "creating" }
    | { type: "created", waiting: true }
    | { type: "created", waiting: false, matchId: string }
    | { type: "joining", waiting: false, random: boolean }
    | { type: "joining", waiting: true }
    | { type: "started", matchId: string, opponent: string, joiner: boolean }
    | { type: "stake proposal", waiting: true }
    | { type: "stake proposal", waiting: false, proposed: boolean, amount: string }
    | { type: "stake approved", amount: string }
    | { type: "stake payed", waiting: true }
    | { type: "stake payed", waiting: false }
    | { type: "game started" }
    | { type: "error", msg: string }

export const matchStateReducer = (state: MatchState, action: MatchStateAction): MatchState => {
    switch (action.type) {
        case "creating":
            return {
                ...state,
                phase: Phase.CREATING_MATCH,
                error: undefined
            };
        case "created":
            if (action.waiting) {
                return { ...state, waiting: true, error: undefined };
            } else {
                return {
                    ...state,
                    waiting: false,
                    matchID: action.matchId,
                    error: undefined
                };
            }
        case "joining":
            if (action.waiting) {
                return { ...state, waiting: true, error: undefined };
            } else {
                return {
                    ...state,
                    phase: Phase.JOINING_MATCH,
                    randomJoin: action.random,
                    waiting: false,
                    error: undefined
                };
            }
        case "started":
            return {
                ...state,
                phase: Phase.STAKE_DECISION,
                matchID: action.matchId,
                waiting: true,
                opponent: action.opponent,
                proposed: action.joiner,
                error: undefined
            };
        case "stake proposal":
            if (action.waiting) {
                return {
                    ...state,
                    waiting: true,
                    proposed: true,
                    error: undefined
                };
            } else {
                return {
                    ...state,
                    waiting: false,
                    proposed: action.proposed,
                    stakeProposed: action.amount,
                    error: undefined
                };
            }
        case "stake approved":
            return {
                ...state,
                waiting: false,
                phase: Phase.STAKE_PAYMENT,
                stakeProposed: BigInt(action.amount),
                payed: false,
                error: undefined
            };
        case 'stake payed':
            return {
                ...state,
                waiting: action.waiting,
                payed: !action.waiting,
                error: undefined
            };
        case "game started":
            return { ...state, phase: Phase.GAME_STARTED, error: undefined };
        case "error":
            return { ...state, waiting: false, error: action.msg }
    }
}