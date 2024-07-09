import React from "react";

import { DataInfo } from "./DataInfo";
import { GuessViewer } from "./GuessViewer";

import { Pair } from "../utils/utils";
import { Code, Feedback } from "../utils/generalTypes";

interface GuessHistoryProps {
    guesses: Pair<Code, Feedback>[] // the history of guesses
    guessTotal: string // the total number of guesses
    checkable: boolean // whether each element should be checkable or not
    onClick?: (idx: number, checked: boolean) => void
}

export const GuessHistory: React.FC<GuessHistoryProps> = ({ guesses, guessTotal, checkable, onClick }) => {
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
                            text={"Wrong Positions: " + feedback.wrongPos}
                        />
                    </div>
                </div>
            </div>
        );
    }

    const historyElement = (idx: number, guess: Pair<Code, Feedback>) => {
        const btnAddTest = "Add";
        const btnAddedText = "Added";

        const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const checked = e.target.checked;
            e.target.labels?.forEach((label) => {
                if (checked) {
                    label.textContent = btnAddedText;
                } else {
                    label.textContent = btnAddTest;
                }
            });

            if (onClick === undefined) {
                return;
            } else {
                onClick(
                    Number(e.target.id.substring("guessCheck".length)) - 1,
                    checked);
            }
        }

        const checkBtn = checkable
            ? (
                <div className="col">
                    <input type="checkbox" className="btn-check" id={`guessCheck${idx}`} autoComplete="off" onChange={onChange}></input>
                    <label className="btn btn-outline-secondary" htmlFor={`guessCheck${idx}`}>{btnAddTest}</label>
                </div>
            )
            : (<></>);

        return (
            <div className="accordion-item" key={idx}>
                <h2 className="accordion-header">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={"#guess" + idx.toString()} aria-expanded="false" aria-controls={"guess" + idx.toString()}>
                        {checkBtn}
                        <div className="container-fluid text-center">
                            {"Guess " + idx.toString() + " of " + guessTotal}
                        </div>
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