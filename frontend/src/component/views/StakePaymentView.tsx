import React, { useContext, useEffect } from "react";

import { Alert } from "../Alert";
import { AfkButton } from "../AfkButton";
import { TitleBox } from "../TitleBox";
import { Notice } from "../Notice";
import { Button } from "../Button";
import { DataInfo } from "../DataInfo";
import { Spinner } from "../Spinner";

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";

import { contract, wallet } from "../../configs/contract";
import { payStake } from "../../utils/contractInteraction";
import { setListener, removeAllListeners } from '../../utils/utils';
import { MatchStateAction } from "../../reducers/MatchStateReducer";

export const StakePaymentView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);

    useEffect(() => {
        if (!matchState.payed) {
            const filter = contract.filters.StakePayed(matchState.matchID, wallet.address);
            setListener(filter, () => {
                dispatchMatchState({ type: "stake payed", waiting: false });
            });
        } else {
            const filter = contract.filters.GameStarted(matchState.matchID);
            setListener(filter, () => {
                dispatchMatchState({ type: "game started" });
            });
        }

        setListener(
            contract.filters.PlayerPunished(matchState.matchID, null, null),
            (args) => {
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
    }, [matchState]);

    const payBtnClick = () => {
        payStake(matchState.matchID as string, matchState.stakeProposed as bigint).then((result) => {
            if (!result.success) {
                dispatchMatchState({ type: 'error', msg: result.error });
            }
        });
        dispatchMatchState({ type: 'stake payed', waiting: true });
    }

    const onAfkFail = (err: string) => {
        dispatchMatchState({ type: 'error', msg: err });
    }

    const onAfkAlertClose = () => {
        dispatchMatchState({ type: "afk continue" });
    }

    const errorMsg = matchState.error !== undefined ? (
        <Notice
            text={matchState.error as string}
            type="failure"
            children={undefined}
        />
    ) : <></>;

    const infoBar = (
        <div className="row mb-5">
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

    if (matchState.waiting) {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {afkAlert}
                    <Spinner />
                </div>
            </TitleBox>
        );
    } else if (matchState.payed) {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {errorMsg}
                    <Notice
                        text={"Payment confirmed"}
                        type="success"
                        children={undefined} />
                    <div className="text-center">
                        <span>Waiting for opponent...</span>
                    </div>
                    <div className="mt-5">
                        <AfkButton
                            disabled={false}
                            phase={matchState.phase}
                            onStartFailed={onAfkFail}
                            onTerminateFailed={onAfkFail}
                        />
                    </div>
                </div>
            </TitleBox>
        );
    } else {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {errorMsg}
                    {afkAlert}
                    <Button
                        text="Pay"
                        danger={false}
                        disabled={false}
                        onclick={payBtnClick} />
                </div>
            </TitleBox>
        );
    }
};