import { MatchState, MatchPhase } from '../utils/generalTypes';

export const initialMatchState: MatchState = {
    phase: MatchPhase.START,
    waiting: false,
    randomJoin: undefined,
    matchID: undefined,
    stakeProposed: undefined,
    opponent: undefined,
    proposed: false,
    payed: false,
    error: undefined,
    yourFinalScore: undefined,
    opponentFinalScore: undefined,
    endMsg: undefined,
    punished: undefined
};

export type MatchStateAction =
    | { type: "reset" }
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
    | { type: "game ended", reason: "dispute", punished: boolean, msg: string }
    | { type: "game ended", reason: "game finished", yourScore: number, opponentScore: number }
    | { type: "error", msg: string }

export const matchStateReducer = (state: MatchState, action: MatchStateAction): MatchState => {
    switch (action.type) {
        case "reset":
            return initialMatchState;
        case "creating":
            return {
                ...state,
                phase: MatchPhase.CREATING_MATCH,
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
                    phase: MatchPhase.JOINING_MATCH,
                    randomJoin: action.random,
                    waiting: false,
                    error: undefined
                };
            }
        case "started":
            return {
                ...state,
                phase: MatchPhase.STAKE_DECISION,
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
                phase: MatchPhase.STAKE_PAYMENT,
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
            return { ...state, phase: MatchPhase.GAME_STARTED, error: undefined };
        case "game ended":
            if (action.reason == "dispute") {
                return {
                    ...state,
                    phase: MatchPhase.GAME_ENDED,
                    endMsg: action.msg,
                    punished: action.punished
                };
            } else if (action.reason == "game finished") {
                return {
                    ...state,
                    phase: MatchPhase.GAME_ENDED,
                    yourFinalScore: action.yourScore,
                    opponentFinalScore: action.opponentScore
                }
            }
        case "error":
            return { ...state, waiting: false, error: action.msg }
    }
}