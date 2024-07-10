import React, { useContext, useEffect, useReducer } from "react";

import { Alert } from "../Alert";
import { TitleBox } from "../TitleBox";
import { Notice } from "../Notice";
import { DataInfo } from "../DataInfo";
import { Button } from "../Button";
import { AfkButton } from "../AfkButton";
import { ActionBox } from "../ActionBox";
import { Spinner } from "../Spinner";
import { GuessViewer } from "../GuessViewer";
import { GuessHistory } from "../GuessHistory";
import { SolutionRemainder } from "../SolutionRemainder";
import { CodeSubmitForm } from "../CodeSubmitForm";
import { FeedbackSubmitForm } from "../FeedbackSubmitForm";

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";
import { gameStateReducer, initialGameState } from "../../reducers/GameStateReducer";

import { contract, wallet } from "../../configs/contract";
import { uploadHash, uploadGuess, uploadFeedback, uploadSolution, decodeCode, decodeFeedback, sendDispute, checkWhoWinner } from "../../utils/contractInteraction";
import { setListener, removeAllListeners, Pair } from '../../utils/utils';

import { GamePhase, Solution, Code, Feedback } from "../../utils/generalTypes";

import { getRandomInt } from "../../utils/utils";

import { N_ROUNDS, N_GUESSES, N_COLORS_PER_GUESS } from "../../configs/constants";

export const PlayView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);
    const [gameState, dispatchGameState] = useReducer(gameStateReducer, initialGameState);

    useEffect(() => {
        if (gameState.phase === undefined) {
            const filter = contract.filters.RoundStarted(matchState.matchID, 1, null, null);
            setListener(filter, (args) => {
                if (args[2] === wallet.address) {
                    dispatchGameState({
                        type: "round started",
                        role: "maker",
                        round: Number(args[1])
                    });
                } else {
                    dispatchGameState({
                        type: "round started",
                        role: "breaker",
                        round: Number(args[1])
                    });
                }
            });
        } else if ((gameState.phase === GamePhase.CODE_SUBMISSION && gameState.role === 'maker')
            || (gameState.phase === GamePhase.WAITING_OPPONENT && gameState.role === "breaker" && gameState.lastGuess === undefined)) {

            const filter = contract.filters.SolutionHashSubmitted(matchState.matchID, null);
            setListener(filter, () => {
                dispatchMatchState({ type: "afk reset" });
                dispatchGameState({ type: "new solution", waiting: false });
            });
        } else if ((gameState.phase === GamePhase.CODE_SUBMISSION && gameState.role === 'breaker')
            || (gameState.phase === GamePhase.WAITING_OPPONENT && gameState.role === "maker")) {

            setListener(
                contract.filters.GuessSubmitted(matchState.matchID, null, null), (args) => {
                    dispatchMatchState({ type: "afk reset" });
                    dispatchGameState({
                        type: "new guess",
                        waiting: false,
                        guess: decodeCode(Number(args[2]))
                    });
                });

            setListener(
                contract.filters.RoundEnded(matchState.matchID, gameState.round as number), () => {
                    if (gameState.role === "maker") {
                        uploadSolution(matchState.matchID as string, gameState.solution as Solution).then((result) => {
                            if (!result.success) {
                                dispatchGameState({ type: 'error', msg: result.error as string });
                            }
                        });
                    }

                    dispatchGameState({ type: "round ended" });
                });
        } else if ((gameState.phase === GamePhase.FEEDBACK_SUBMISSION && gameState.role === 'maker')
            || (gameState.phase === GamePhase.WAITING_OPPONENT && gameState.role === "breaker" && gameState.lastGuess !== undefined)) {

            const filter = contract.filters.FeedbackSubmitted(matchState.matchID, null, null);
            setListener(filter, (args) => {
                dispatchMatchState({ type: "afk reset" });
                dispatchGameState({
                    type: "new feedback",
                    waiting: false,
                    fb: decodeFeedback(Number(args[2]))
                });
            });
        } else if (gameState.phase === GamePhase.END_ROUND && !gameState.roundEnded) {
            const filter = contract.filters.SolutionSubmitted(matchState.matchID, null, null);
            setListener(filter, (args) => {
                dispatchMatchState({ type: "afk reset" });
                dispatchGameState({
                    type: "final solution submitted",
                    solution: {
                        code: decodeCode(Number(args[2])),
                        salt: 0
                    }
                });
            });
        } else if (gameState.phase === GamePhase.END_ROUND && gameState.roundEnded && !gameState.scoresUpdated) {
            const filter = contract.filters.ScoresUpdated(matchState.matchID, null, null);
            setListener(filter, (args) => {
                let updatedScore = 0;
                if (matchState.randomJoin === undefined) {
                    // I am the creator
                    if (gameState.yourScore == Number(args[1])) {
                        updatedScore = Number(args[2]);
                    } else {
                        updatedScore = Number(args[1]);
                    }
                } else {
                    // I am the challenger
                    if (gameState.yourScore == Number(args[2])) {
                        updatedScore = Number(args[1]);
                    } else {
                        updatedScore = Number(args[2]);
                    }
                }

                dispatchGameState({
                    type: "scores updated",
                    waiting: false,
                    score: updatedScore
                });
            });
        }

        setListener(
            contract.filters.PlayerPunished(matchState.matchID, null, null), (args) => {
                dispatchMatchState({
                    type: "game ended",
                    genuine: false,
                    punished: args[1] as string === wallet.address,
                    msg: args[2] as string
                });
            });

        if (matchState.afkAlertShowed === undefined) {
            const filter = contract.filters.AfkCheckStarted(matchState.matchID, null, null);
            setListener(filter, (args) => {
                dispatchMatchState({
                    type: "afk started",
                    move: args[1] != wallet.address
                });
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

    const onContinueBtnClick = () => {
        if (gameState.round === N_ROUNDS && gameState.roundEnded) {
            checkWhoWinner(matchState.matchID as string)
                .then((result) => {
                    if (!result.success
                        && result.error !== "The match specified does not exist.") {
                        dispatchGameState({
                            type: 'error',
                            msg: result.error as string
                        });
                    } else {
                        dispatchMatchState({
                            type: "game ended",
                            genuine: true,
                            yourScore: gameState.yourScore,
                            opponentScore: gameState.opponentScore
                        });
                    }
                });
            dispatchGameState({ type: "scores updated", waiting: true });
        } else {
            if (gameState.role === "breaker") {
                dispatchGameState({
                    type: "round started",
                    role: "maker",
                    round: (gameState.round as number) + 1
                });
            } else {
                dispatchGameState({
                    type: "round started",
                    role: "breaker",
                    round: (gameState.round as number) + 1
                });
            }
        }
    }

    const onGuessDisputeBtnClick = (idx: number, checked: boolean) => {
        if (checked) {
            dispatchGameState({ type: "dispute guess added", idx: idx });
        } else {
            dispatchGameState({ type: "dispute guess removed", idx: idx });
        }
    }

    const onDisputeClick = () => {
        const indexes = gameState
            .disputedGuesses?.map((val: boolean, index: number) => val ? index : -1)
            .filter(index => index !== -1);

        sendDispute(matchState.matchID as string, indexes as number[])
            .then((result) => {
                if (!result.success) {
                    dispatchGameState({ type: 'error', msg: result.error as string });
                }
            });
        dispatchGameState({ type: "dispute started" });
    }

    const onAfkFail = (err: string) => {
        dispatchGameState({ type: 'error', msg: err });
    }

    const onAfkHalt = () => {
        dispatchGameState({ type: "end wait" });
    }

    const onAfkAlertClose = () => {
        dispatchMatchState({ type: "afk continue" });
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
                    <AfkButton
                        disabled={gameState.phase === undefined}
                        phase={gameState.phase}
                        onStartFailed={onAfkFail}
                        onTerminateFailed={onAfkFail}
                        onTerminateSuccess={onAfkHalt}
                    />
                </div>
                <div className="col">
                    <DataInfo text={"Opponent Score: " + gameState.opponentScore.toString()} />
                </div>
            </div>
        </div>
    );

    const afkAlert = matchState.afkAlertShowed === false
        ? (
            <Alert
                title="AFK Check"
                type="danger"
                closeBtnText="Close"
                onClose={onAfkAlertClose}
            >
                <p className="text-center">Your opponent started an AFK Check on you. Make a move!</p>
            </Alert>
        )
        : (<></>);

    if (gameState.phase === undefined) {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {errorMsg}
                    {afkAlert}
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
                case GamePhase.END_ROUND:
                    if (gameState.role === "maker") {
                        const scoreDelta = gameState.yourScore - gameState.oldScore;

                        return (
                            <div className="text-center">
                                <Notice
                                    text="Feedback submitted"
                                    type="success"
                                    children={<></>}
                                />
                                <Notice
                                    text={"Earned points: " + scoreDelta.toString()}
                                    type="info"
                                    children={<></>}
                                />
                                <div className="row">
                                    <div className="col"></div>
                                    <div className="col">
                                        <Button
                                            text="Continue"
                                            danger={false}
                                            disabled={false}
                                            onclick={onContinueBtnClick}
                                        />
                                    </div>
                                    <div className="col"></div>
                                </div>
                            </div>
                        );
                    } else {
                        const isLastGuessCorrect = (gameState.guessHistory.at(-1) as Pair<Code, Feedback>)[1].correctPos == 4;

                        const notice = (
                            <Notice
                                text={isLastGuessCorrect
                                    ? "Correct guess" : "You lost this round"}
                                type={isLastGuessCorrect ? "success" : "failure"}
                                children={<></>}
                            />
                        );

                        const disputeBtnDisabled = gameState.disputedGuesses?.find((val) => { return val }) === undefined;

                        if (gameState.solution === undefined) {
                            return (
                                <div className="text-center">
                                    {notice}
                                    <span>Waiting for opponent...</span>
                                </div>
                            );
                        } else {
                            const scoreUpdatedNotice = gameState.scoresUpdated === true
                                ? (
                                    <Notice
                                        text="Score updated"
                                        type="info"
                                        children={<></>}
                                    />
                                )
                                : (<></>);

                            return (
                                <div className="text-center">
                                    {notice}
                                    {scoreUpdatedNotice}
                                    <div className="mt-4">
                                        <GuessViewer
                                            title="Solution:"
                                            guess={gameState.solution.code}
                                        />
                                    </div>
                                    <div className="row">
                                        <div className="col">
                                            <Button
                                                text="Dispute"
                                                danger={true}
                                                disabled={disputeBtnDisabled}
                                                onclick={onDisputeClick}
                                            />
                                        </div>
                                        <div className="col">
                                            <Button
                                                text="Continue"
                                                danger={false}
                                                disabled={false}
                                                onclick={onContinueBtnClick}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    }
                default:
                    // should not happen
                    return <></>;
            }
        };

        const checkableGuessHistory = gameState.phase === GamePhase.END_ROUND
            && gameState.solution !== undefined
            && gameState.role === "breaker";

        const guessHistory = gameState.guessHistory.length == 0 ? <></> :
            <GuessHistory
                guesses={gameState.guessHistory}
                guessTotal={N_GUESSES.toString()}
                checkable={checkableGuessHistory}
                onClick={onGuessDisputeBtnClick}
            />;

        const solutionRemainder = gameState.role === "maker"
            && gameState.solution !== undefined
            ? <SolutionRemainder solution={gameState.solution.code} />
            : <></>;

        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {errorMsg}
                    {afkAlert}
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