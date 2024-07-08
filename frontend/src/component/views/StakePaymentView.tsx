import React, { useContext, useEffect } from "react";

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
            setListener<MatchStateAction>(filter, dispatchMatchState, () => {
                return { type: "stake payed", waiting: false };
            });
        } else {
            const filter = contract.filters.GameStarted(matchState.matchID);
            setListener<MatchStateAction>(filter, dispatchMatchState, () => {
                return { type: "game started" };
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

    if (matchState.waiting) {
        return (
            <TitleBox>
                <div>
                    {infoBar}
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
                </div>
            </TitleBox>
        );
    } else {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {errorMsg}
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