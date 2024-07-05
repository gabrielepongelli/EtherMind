import React, { useContext, useEffect } from "react";

import { TitleBox } from "../TitleBox";
import { Notice } from "../Notice";
import { Button } from "../Button";
import { DataInfo } from "../DataInfo";
import { Spinner } from "../Spinner";

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";

import ethers from "ethers";
import { contract, wallet } from "../../configs/contract";
import { payStake } from "../../utils/contractInteraction";

export const StakePaymentView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);

    useEffect(() => {
        if (!matchState.payed) {
            const filter = contract.filters.StakePayed(matchState.matchID, wallet.address);
            const eventHandler = (event: ethers.ContractEventPayload) => {
                console.log(`StakePayed event: matchID = ${event.args[0]}, by = ${event.args[1]}`);

                dispatchMatchState({ type: "stake payed", waiting: false });
                contract.off(filter);
            };

            contract.on(filter, eventHandler);
        } else {
            const filter = contract.filters.GameStarted(matchState.matchID);
            const eventHandler = (event: ethers.ContractEventPayload) => {
                console.log(`GameStarted event: matchID = ${event.args[0]}`);

                dispatchMatchState({ type: "game started" });
                contract.off(filter);
            };

            contract.on(filter, eventHandler);
        }
    }, [matchState]);

    const payBtnClick = () => {
        payStake(matchState.matchID || "", matchState.stakeProposed || BigInt(0));
        dispatchMatchState({ type: 'stake payed', waiting: true });
    }

    const infoBar = (
        <div className="row">
            <div className="col-5 mb-3">
                <DataInfo text={"Match ID: " + matchState.matchID} />
            </div>
            <div className="col-2 mb-3">
                <DataInfo text={"Stake: " + matchState.stakeProposed + " Gwei"} />
            </div>
            <div className="col-5 mb-3">
                <DataInfo text={"Opponent: " + matchState.opponent} />
            </div>
        </div>
    );

    if (matchState.waiting) {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    <div className="row mt-5">
                        <div className="col-1"></div>
                        <div className="col">
                            <Spinner />
                        </div>
                        <div className="col-1"></div>
                    </div>
                </div>
            </TitleBox>
        );
    } else if (matchState.payed) {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    <div className="row mt-5">
                        <div className="col-1"></div>
                        <div className="col">
                            <Notice
                                text={"Payment confirmed"}
                                type="success"
                                children={undefined} />
                        </div>
                        <div className="col-1"></div>
                    </div>
                    <div className="row">
                        <div className="col"></div>
                        <div className="col-6 text-center">
                            <span>Waiting for opponent...</span>
                        </div>
                        <div className="col"></div>
                    </div>
                </div>
            </TitleBox>
        );
    } else {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    <div className="row">
                        <div className="col-1"></div>
                        <div className="col-3 container d-flex mt-5">
                            <Button
                                text="Pay"
                                danger={false}
                                disabled={false}
                                onclick={payBtnClick} />
                        </div>
                        <div className="col-1"></div>
                    </div>
                </div>
            </TitleBox>
        );
    }
};