import { GameState, GamePhase, Solution, Code, Feedback } from '../utils/generalTypes';

export const initialGameState: GameState = {
    phase: undefined,
    waiting: true,
    role: undefined,
    yourScore: 0,
    opponentScore: 0,
    round: undefined,
    guess: undefined,
    guessHistory: [],
    lastGuess: undefined,
    solution: undefined
};

export type GameStateAction =
    | { type: "round started", role: "breaker" | "maker", round: number }
    | { type: "new solution", waiting: true, solution: Solution }
    | { type: "new solution", waiting: false }
    | { type: "new guess", waiting: true }
    | { type: "new guess", waiting: false, guess: Code }
    | { type: "new feedback", waiting: true }
    | { type: "new feedback", waiting: false, fb: Feedback }
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
                    error: undefined
                };
            } else {
                return {
                    ...state,
                    phase: GamePhase.CODE_SUBMISSION,
                    role: action.role,
                    waiting: false,
                    round: action.round,
                    guess: undefined,
                    error: undefined
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
                const phase = state.role == "maker"
                    ? GamePhase.WAITING_OPPONENT : GamePhase.CODE_SUBMISSION;

                const guess = state.role == "maker" ? state.guess : 1;

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
                const phase = state.role == "maker"
                    ? GamePhase.FEEDBACK_SUBMISSION : GamePhase.WAITING_OPPONENT;

                const guess = state.role == "maker"
                    ? (state.guess === undefined ? 1 : state.guess as number + 1)
                    : state.guess;

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
                const phase = state.role == "maker"
                    ? GamePhase.WAITING_OPPONENT : GamePhase.CODE_SUBMISSION;

                const guess = state.role == "maker"
                    ? state.guess : state.guess as number + 1;

                return {
                    ...state,
                    phase: phase,
                    waiting: false,
                    error: undefined,
                    lastGuess: undefined,
                    guess: guess,
                    guessHistory: [
                        ...state.guessHistory,
                        [state.lastGuess as Code, action.fb]
                    ]
                };
            }
        case "error":
            return { ...state, waiting: false, error: action.msg };
    }
}