import React from "react";

interface ActionBoxProps {
    role: string // the role of the player (code breaker or maker)
    roundNumber: string // the actual round number
    roundTotal: string // the total number of rounds
    guessNumber?: string // the actual guess number
    guessTotal?: string // the total number of guesses
    children?: React.ReactElement // content of the action
}

export const ActionBox: React.FC<ActionBoxProps> = (props) => {
    const roleText = "Code " + props.role[0].toUpperCase() + props.role.slice(1);

    const guessText = (props.guessNumber && props.guessTotal)
        ? "Guess " + props.guessNumber + " of " + props.guessTotal : "";

    const roundText = "Round " + props.roundNumber + " of " + props.roundTotal;

    return (
        <div className="card">
            <div className="card-header">
                <div className="row">
                    <div className="col text-start">
                        {roleText}
                    </div>
                    <div className="col text-center">
                        {guessText}
                    </div>
                    <div className="col text-end">
                        {roundText}
                    </div>
                </div>
            </div>
            <div className="card-body p-2">
                <div className="py-3 px-5">
                    {props.children}
                </div>
            </div>
        </div>
    );
};