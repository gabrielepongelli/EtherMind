import { Pair } from "./utils";

type ColorCode = number;

export interface Code {
    c1: ColorCode
    c2: ColorCode
    c3: ColorCode
    c4: ColorCode
}

export interface Solution {
    code: Code,
    salt: number
};

export enum Color {
    RED = "Red",
    GREEN = "Green",
    BLUE = "Blue",
    YELLOW = "Yellow",
    BROWN = "Brown",
    ORANGE = "Orange"
}

export interface Feedback {
    correctPos: number
    wrongPos: number
}

export enum MatchPhase {
    START,
    CREATING_MATCH,
    JOINING_MATCH,
    STAKE_DECISION,
    STAKE_PAYMENT,
    GAME_STARTED,
    GAME_ENDED
}

export interface MatchState {
    phase: MatchPhase; // the phase of the matchmaking
    waiting: boolean // whether the player is waiting for the result of an operation
    randomJoin?: boolean // whether a random join is performed or not
    matchID?: string // the match id
    opponent?: string // the address of the opponent
    stakeProposed?: string | bigint // the stake value being proposed
    proposed: boolean // whether the stake proposal is coming from you or not
    payed: boolean // whether the stake has been payed or not
    error?: string // the error message
    yourFinalScore?: number
    opponentFinalScore?: number
    endMsg?: string
    punished?: boolean
}

export enum GamePhase {
    CODE_SUBMISSION,
    FEEDBACK_SUBMISSION,
    WAITING_OPPONENT,
    END_ROUND,
    DISPUTE
}

export interface GameState {
    phase?: GamePhase // the phase of the game
    waiting: boolean // whether the player is waiting for the result of an operation
    role?: "breaker" | "maker" // role of the player
    yourScore: number // score of the player
    opponentScore: number // score of the opponent
    round?: number // current round number
    guess?: number // current guess number
    guessHistory: Pair<Code, Feedback>[] // history of all the guesses made during the round
    lastGuess?: Code // the last guess submitted
    solution?: Solution // the solution submitted for this round
    roundEnded: boolean // whether the current round is ended or not
    scoresUpdated: boolean // whether the scores have been updated or not
    oldScore: number // the score of the last round
    error?: string // the error message
    disputedGuesses?: boolean[] // the indexes of guesses to dispute
}