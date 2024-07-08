import React from "react";

import { DataInfo } from "./DataInfo";
import { GuessViewer } from "./GuessViewer";

import { Pair } from "../utils/utils";
import { Code, Feedback } from "../utils/generalTypes";

interface GuessHistoryProps {
    guesses: Pair<Code, Feedback>[] // the history of guesses
    guessTotal: string // the total number of guesses
}

export const GuessHistory: React.FC<GuessHistoryProps> = ({ guesses, guessTotal }) => {
    const feedbackRecord = (feedback: Feedback) => {
        return (
            <div>
                <div className="text-center mb-4">Feedback</div>
                <div className="row">
                    <div className="col">
                        <DataInfo
                            text={"Correct Positions: " + feedback.correctPos}
                        />
                    </div>
                    <div className="col">
                        <DataInfo
                            text={"Wrong Positions: " + feedback.correctPos}
                        />
                    </div>
                </div>
            </div>
        );
    }

    const historyElement = (idx: number, guess: Pair<Code, Feedback>) => {
        return (
            <div className="accordion-item" key={idx}>
                <h2 className="accordion-header">
                    <button className="accordion-button collapsed text-center" type="button" data-bs-toggle="collapse" data-bs-target={"#guess" + idx.toString()} aria-expanded="false" aria-controls={"guess" + idx.toString()}>
                        {"Guess " + idx.toString() + " of " + guessTotal}
                    </button>
                </h2>
                <div id={"guess" + idx.toString()} className="accordion-collapse collapse" data-bs-parent="#guessHistory">
                    <div className="accordion-body">
                        <div className="mt-3 mb-4">
                            <GuessViewer
                                title="Guess"
                                guess={guess[0]}
                            />
                        </div>
                        {feedbackRecord(guess[1])}
                    </div>
                </div>
            </div>
        );
    }

    let history = [];
    for (let i = guesses.length; i > 0; i--) {
        history.push(historyElement(i, guesses[i - 1]));
    }


    return (
        <div className="accordion" id="guessHistory">
            {history}
        </div>
    );
}