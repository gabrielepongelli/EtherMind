import React, { useContext, useState, useEffect } from "react";

import { TitleBox } from "../TitleBox";
import { Notice } from "../Notice";
import { Button } from "../Button";
import { DataInfo } from "../DataInfo";
import { TextInputBar } from "../TextInputBar";
import { Spinner } from "../Spinner";

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";

import { contract, wallet } from "../../configs/contract";
import { proposeStake } from "../../utils/contractInteraction";
import { setListener, removeAllListeners } from '../../utils/utils';

export const StakeDecisionView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);
    const [stake, setStake] = useState("");

    useEffect(() => {
        setListener(contract.filters.StakeFixed(matchState.matchID, null), (args) => {
            dispatchMatchState({ type: "stake approved", amount: args[1] });
        });

        if (matchState.waiting) {
            const proposalSender = matchState.proposed ? wallet.address : matchState.opponent as string;

            const filter = contract.filters.StakeProposal(matchState.matchID, proposalSender, null);
            setListener(filter, (args) => {
                dispatchMatchState({
                    type: "stake proposal",
                    waiting: false,
                    proposed: args[1] === wallet.address,
                    amount: args[2]
                });
            });
        } else if (matchState.proposed) {
            const filter = contract.filters.StakeProposal(matchState.matchID, matchState.opponent as string, null);
            setListener(filter, (args) => {
                dispatchMatchState({
                    type: "stake proposal",
                    waiting: false,
                    proposed: false,
                    amount: args[2]
                });
            });
        }

        return removeAllListeners;
    }, [matchState]);

    const stakeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setStake(event.target.value);
    };

    const proposeBtnClick = () => {
        proposeStake(matchState.matchID as string, stake)
            .then((result) => {
                if (!result.success) {
                    dispatchMatchState({ type: 'error', msg: result.error });
                }
            });
        dispatchMatchState({ type: 'stake proposal', waiting: true });
    }

    const confirmBtnClick = () => {
        proposeStake(matchState.matchID as string, matchState.stakeProposed as string).then((result) => {
            if (!result.success) {
                dispatchMatchState({ type: 'error', msg: result.error });
            }
        });
        dispatchMatchState({ type: 'stake proposal', waiting: true });
    }

    const errorMsg = matchState.error !== undefined ? (
        <Notice
            text={matchState.error as string}
            type="failure"
            children={undefined}
        />
    ) : <></>;

    const infoBar = (
        <div className="row justify-content-center mb-5">
            <div className="col">
                <DataInfo text={"Match ID: " + matchState.matchID} />
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
    } else if (matchState.proposed) {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {errorMsg}
                    <Notice
                        text={"Proposed: " + matchState.stakeProposed + " Wei"}
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
                    <Notice
                        text={"Stake proposed: " + matchState.stakeProposed + " Wei"}
                        type="info"
                        children={undefined} />
                    <div className='justify-content-center'>
                        <Button
                            text="Confirm"
                            danger={false}
                            disabled={false}
                            onclick={confirmBtnClick} />
                    </div>
                    <div className="text-center mb-5 pt-3">
                        <div className="pt-4">
                            <span>or</span>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col mb-3">
                            <TextInputBar
                                placeholder='Stake Proposal (in Wei)'
                                leftText='⧫'
                                onchange={stakeHandler}
                                children={<></>} />
                        </div>
                        <div className="col-3">
                            <Button
                                text="Propose"
                                danger={false}
                                disabled={false}
                                onclick={proposeBtnClick} />
                        </div>
                    </div>
                </div>
            </TitleBox>
        );
    }
}