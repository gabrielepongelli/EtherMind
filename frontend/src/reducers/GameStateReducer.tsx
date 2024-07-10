import { N_GUESSES } from '../configs/constants';
import { GameState, GamePhase, Solution, Code, Feedback } from '../utils/generalTypes';

export const initialGameState: GameState = {
    phase: undefined,
    waiting: true,
    role: undefined,
    yourScore: 0,
    oldScore: 0,
    opponentScore: 0,
    round: undefined,
    guess: undefined,
    guessHistory: [],
    lastGuess: undefined,
    solution: undefined,
    roundEnded: false,
    scoresUpdated: false,
    disputedGuesses: undefined
};

export type GameStateAction =
    | { type: "round started", role: "breaker" | "maker", round: number }
    | { type: "new solution", waiting: true, solution: Solution }
    | { type: "new solution", waiting: false }
    | { type: "new guess", waiting: true }
    | { type: "new guess", waiting: false, guess: Code }
    | { type: "new feedback", waiting: true }
    | { type: "new feedback", waiting: false, fb: Feedback }
    | { type: "round ended" }
    | { type: "final solution submitted", solution: Solution }
    | { type: "scores updated", waiting: false, score: number }
    | { type: "scores updated", waiting: true }
    | { type: "dispute guess added", idx: number }
    | { type: "dispute guess removed", idx: number }
    | { type: "dispute started" }
    | { type: "end wait" }
    | { type: "error", msg: string }

export const gameStateReducer = (state: GameState, action: GameStateAction): GameState => {
    switch (action.type) {
        case "round started":
            if (action.role == "breaker") {
                return {
                    ...state,
                    phase: GamePhase.WAITING_OPPONENT,
                    role: action.role,
                    waiting: false,
                    round: action.round,
                    guess: undefined,
                    error: undefined,
                    roundEnded: false,
                    scoresUpdated: false,
                    disputedGuesses: undefined,
                    solution: undefined,
                    guessHistory: []
                };
            } else {
                return {
                    ...state,
                    phase: GamePhase.CODE_SUBMISSION,
                    role: action.role,
                    waiting: false,
                    round: action.round,
                    guess: undefined,
                    error: undefined,
                    roundEnded: false,
                    scoresUpdated: false,
                    disputedGuesses: undefined,
                    solution: undefined,
                    guessHistory: []
                };
            }
        case "new solution":
            if (action.waiting) {
                return {
                    ...state,
                    waiting: true,
                    solution: action.solution,
                    error: undefined
                };
            } else {
                const phase = state.role === "maker"
                    ? GamePhase.WAITING_OPPONENT : GamePhase.CODE_SUBMISSION;

                const guess = state.role === "maker" ? state.guess : 1;

                return {
                    ...state,
                    phase: phase,
                    waiting: false,
                    error: undefined,
                    lastGuess: undefined,
                    guess: guess
                };
            }
        case "new guess":
            if (action.waiting) {
                return {
                    ...state,
                    waiting: true,
                    error: undefined
                };
            } else {
                const phase = state.role === "maker"
                    ? GamePhase.FEEDBACK_SUBMISSION : GamePhase.WAITING_OPPONENT;

                const guess = state.role === "maker" && state.guess === undefined
                    ? 1 : state.guess as number;

                return {
                    ...state,
                    phase: phase,
                    waiting: false,
                    error: undefined,
                    lastGuess: action.guess,
                    guess: guess
                };
            }
        case "new feedback":
            if (action.waiting) {
                return {
                    ...state,
                    waiting: true,
                    error: undefined
                };
            } else {
                const waiting = state.role === "maker" && action.fb.correctPos == 4;

                const phase = state.role === "maker"
                    ? GamePhase.WAITING_OPPONENT : GamePhase.CODE_SUBMISSION;

                const guess = state.role === "maker" && action.fb.correctPos == 4
                    ? undefined : state.guess as number + 1;

                return {
                    ...state,
                    phase: phase,
                    waiting: waiting,
                    error: undefined,
                    lastGuess: undefined,
                    guess: guess,
                    guessHistory: [
                        ...state.guessHistory,
                        [state.lastGuess as Code, action.fb]
                    ]
                };
            }
        case "round ended":
            const waiting = state.role === "maker";

            return {
                ...state,
                phase: GamePhase.END_ROUND,
                waiting: waiting,
                error: undefined,
                guess: undefined
            };
        case "final solution submitted":
            if (state.role === "maker") {
                return {
                    ...state,
                    error: undefined,
                    solution: action.solution,
                    roundEnded: true
                };
            } else {
                return {
                    ...state,
                    error: undefined,
                    solution: action.solution,
                    roundEnded: true,
                    disputedGuesses: Array<boolean>(N_GUESSES).fill(
                        false, 0, N_GUESSES)
                };
            }
        case "scores updated":
            if (action.waiting) {
                return { ...state, waiting: true };
            } else if (state.role === "maker") {
                return {
                    ...state,
                    waiting: false,
                    error: undefined,
                    yourScore: action.score,
                    oldScore: state.yourScore,
                    scoresUpdated: true
                };
            } else {
                return {
                    ...state,
                    error: undefined,
                    opponentScore: action.score,
                    scoresUpdated: true
                };
            }
        case "dispute guess added":
            {
                const newDisputedGuesses = state.disputedGuesses as boolean[];
                newDisputedGuesses[action.idx] = true;

                return {
                    ...state,
                    error: undefined,
                    disputedGuesses: newDisputedGuesses
                };
            }
        case "dispute guess removed":
            {
                const newDisputedGuesses = state.disputedGuesses as boolean[];
                newDisputedGuesses[action.idx] = false;

                return {
                    ...state,
                    error: undefined,
                    disputedGuesses: newDisputedGuesses
                };
            }
        case "dispute started":
            return {
                ...state,
                phase: GamePhase.DISPUTE,
                waiting: true
            };
        case "end wait":
            return { ...state, phase: undefined };
        case "error":
            const phase = state.phase === GamePhase.DISPUTE ? GamePhase.END_ROUND : state.phase;

            const disputedGuesses = state.disputedGuesses !== undefined
                ? Array<boolean>(N_GUESSES).fill(false, 0, N_GUESSES)
                : undefined;

            return {
                ...state,
                phase: phase,
                waiting: false,
                error: action.msg,
                disputedGuesses: disputedGuesses
            };
    }
}