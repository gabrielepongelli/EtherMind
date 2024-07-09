import React, { useContext, useEffect } from "react";

import { TitleBox } from "../TitleBox";
import { Notice } from "../Notice";
import { DataInfo } from "../DataInfo";
import { Button } from "../Button";
import { ActionBox } from "../ActionBox";
import { Spinner } from "../Spinner";
import { GuessViewer } from "../GuessViewer";
import { GuessHistory } from "../GuessHistory";
import { SolutionRemainder } from "../SolutionRemainder";
import { CodeSubmitForm } from "../CodeSubmitForm";
import { FeedbackSubmitForm } from "../FeedbackSubmitForm";

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";
import { GameStateContext, GameStateSetContext } from "../../contexts/GameStateContext";

import { contract, wallet } from "../../configs/contract";
import { uploadHash, uploadGuess, uploadFeedback, decodeCode, decodeFeedback } from "../../utils/contractInteraction";
import { setListener, removeAllListeners } from '../../utils/utils';

import { GameStateAction } from "../../reducers/GameStateReducer";
import { GamePhase, Solution, Code, Feedback } from "../../utils/generalTypes";

import { getRandomInt } from "../../utils/utils";

import { N_ROUNDS, N_GUESSES, N_COLORS_PER_GUESS } from "../../configs/constants";

export const PlayView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);
    const gameState = useContext(GameStateContext);
    const dispatchGameState = useContext(GameStateSetContext);

    useEffect(() => {
        if (gameState.phase === undefined) {
            const filter = contract.filters.RoundStarted(matchState.matchID, 1, null, null);
            setListener<GameStateAction>(filter, dispatchGameState, (args) => {
                if (args[2] === wallet.address) {
                    return { type: "round started", role: "maker", round: args[1] };
                } else {
                    return { type: "round started", role: "breaker", round: args[1] };
                }
            });
        } else if ((gameState.phase === GamePhase.CODE_SUBMISSION && gameState.role === 'maker')
            || (gameState.phase === GamePhase.WAITING_OPPONENT && gameState.role === "breaker" && gameState.lastGuess === undefined)) {

            const filter = contract.filters.SolutionHashSubmitted(matchState.matchID, null);
            setListener<GameStateAction>(filter, dispatchGameState, () => {
                return { type: "new solution", waiting: false };
            });
        } else if ((gameState.phase === GamePhase.CODE_SUBMISSION && gameState.role === 'breaker')
            || (gameState.phase === GamePhase.WAITING_OPPONENT && gameState.role === "maker")) {

            const filter = contract.filters.GuessSubmitted(matchState.matchID, null, null);
            setListener<GameStateAction>(filter, dispatchGameState, (args) => {
                return { type: "new guess", waiting: false, guess: decodeCode(Number(args[2])) };
            });
        } else if ((gameState.phase === GamePhase.FEEDBACK_SUBMISSION && gameState.role === 'maker')
            || (gameState.phase === GamePhase.WAITING_OPPONENT && gameState.role === "breaker" && gameState.lastGuess !== undefined)) {

            const filter = contract.filters.FeedbackSubmitted(matchState.matchID, null, null);
            setListener<GameStateAction>(filter, dispatchGameState, (args) => {
                return { type: "new feedback", waiting: false, fb: decodeFeedback(Number(args[2])) };
            });
        }

        return removeAllListeners;
    }, [gameState]);

    const errorMsg = gameState.error !== undefined ? (
        <Notice
            text={gameState.error as string}
            type="failure"
            children={undefined}
        />
    ) : <></>;

    const onSolutionSubmit = (code: Code) => {
        const solution: Solution = { code: code, salt: getRandomInt() };
        uploadHash(matchState.matchID as string, solution).then((result) => {
            if (!result.success) {
                dispatchGameState({ type: 'error', msg: result.error as string });
            }
        });
        dispatchGameState({ type: 'new solution', waiting: true, solution: solution });
    }

    const onGuessSubmit = (guess: Code) => {
        uploadGuess(matchState.matchID as string, guess).then((result) => {
            if (!result.success) {
                dispatchGameState({ type: 'error', msg: result.error as string });
            }
        });
        dispatchGameState({ type: 'new guess', waiting: true });
    }

    const onFeedbackSubmit = (fb?: Feedback) => {
        if (fb === undefined) {
            fb = {
                correctPos: N_COLORS_PER_GUESS,
                wrongPos: N_COLORS_PER_GUESS
            };
        } else {
            uploadFeedback(matchState.matchID as string, fb).then((result) => {
                if (!result.success) {
                    dispatchGameState({ type: 'error', msg: result.error as string });
                }
            });
            dispatchGameState({ type: 'new guess', waiting: true });
        }
    }

    const infoBar = (
        <div>
            <div className="row">
                <div className="col">
                    <DataInfo text={"Match ID: " + matchState.matchID} />
                </div>
                <div className="col">
                    <DataInfo text={"Stake: " + matchState.stakeProposed + " Gwei"} />
                </div>
                <div className="col">
                    <DataInfo text={"Opponent: " + matchState.opponent} />
                </div>
            </div>
            <div className="row  mb-5">
                <div className="col">
                    <DataInfo text={"Your Score: " + gameState.yourScore.toString()} />
                </div>
                <div className="col">
                    <Button
                        text="Check AFK"
                        danger={true}
                        onclick={() => { }}
                        disabled={false}
                    />
                </div>
                <div className="col">
                    <DataInfo text={"Opponent Score: " + gameState.opponentScore.toString()} />
                </div>
            </div>
        </div>
    );

    if (gameState.phase === undefined) {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {errorMsg}
                    <Spinner />
                </div>
            </TitleBox>
        );
    } else {
        const action = () => {
            if (gameState.waiting) {
                return <Spinner />;
            }

            switch (gameState.phase) {
                case undefined:
                    // should not happen
                    return <></>;
                case GamePhase.CODE_SUBMISSION:
                    if (gameState.guess === undefined) {
                        // it's a solution
                        return (
                            <div className="text-center">
                                <p>Choose a code</p>
                                <CodeSubmitForm onSubmit={onSolutionSubmit} />
                            </div>
                        );
                    } else {
                        // it's a guess
                        return (
                            <div className="text-center">
                                <p>Make a guess</p>
                                <CodeSubmitForm onSubmit={onGuessSubmit} />
                            </div>
                        );
                    }
                case GamePhase.FEEDBACK_SUBMISSION:
                    return (
                        <div>
                            <div className="my-4">
                                <GuessViewer
                                    title="Opponent guess"
                                    guess={gameState.lastGuess as Code}
                                />
                            </div>
                            <p className="text-center mt-4">Give a feedback</p>
                            <FeedbackSubmitForm
                                onSubmit={onFeedbackSubmit}
                            />
                        </div>
                    );
                case GamePhase.WAITING_OPPONENT:
                    if (gameState.role === "maker") {
                        const noticeText = gameState.guess === undefined
                            ? "Code submitted" : "Feedback submitted";
                        return (
                            <div className="text-center">
                                <Notice
                                    text={noticeText}
                                    type="success"
                                    children={<></>}
                                />
                                <p className="mt-4">Waiting for opponent...</p>
                            </div>
                        );
                    } else {
                        const notice = gameState.lastGuess === undefined ? <></>
                            : <Notice
                                text="Guess submitted"
                                type="success"
                                children={<></>}
                            />;

                        return (
                            <div className="text-center">
                                {notice}
                                <span>Waiting for opponent...</span>
                            </div>
                        );
                    }
            }
        };

        const guessHistory = gameState.guessHistory.length == 0 ? <></> :
            <GuessHistory
                guesses={gameState.guessHistory}
                guessTotal={N_GUESSES.toString()} />;

        const solutionRemainder = gameState.role === "maker"
            && gameState.solution !== undefined
            ? <SolutionRemainder solution={gameState.solution.code} />
            : <></>;

        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {errorMsg}
                    {solutionRemainder}
                    <ActionBox
                        role={gameState.role as string}
                        roundNumber={(gameState.round as number).toString()}
                        roundTotal={N_ROUNDS.toString()}
                        guessNumber={gameState.guess === undefined ? undefined : gameState.guess.toString()}
                        guessTotal={N_GUESSES.toString()}
                    >
                        {action()}
                    </ActionBox>
                    <div className="my-4">
                        {guessHistory}
                    </div>
                </div>
            </TitleBox>
        );
    }
}