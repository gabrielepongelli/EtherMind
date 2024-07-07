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
        setListener(contract.filters.StakeFixed(matchState.matchID, null),
            dispatchMatchState, (args) => {
                return { type: "stake approved", amount: args[1] };
            });

        if (matchState.waiting) {
            const proposalSender = matchState.proposed ? wallet.address : matchState.opponent as string;

            const filter = contract.filters.StakeProposal(matchState.matchID, proposalSender, null);
            setListener(filter, dispatchMatchState, (args) => {
                return { type: "stake proposal", waiting: false, proposed: args[1] === wallet.address, amount: args[2] };
            });
        } else if (matchState.proposed) {
            const filter = contract.filters.StakeProposal(matchState.matchID, matchState.opponent as string, null);
            setListener(filter, dispatchMatchState, (args) => {
                return { type: "stake proposal", waiting: false, proposed: false, amount: args[2] };
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

    const err = matchState.error !== undefined;
    const errorMsg = err ? (
        <div className="row mt-5">
            <div className="col-1"></div>
            <div className="col">
                <Notice
                    text={matchState.error as string}
                    type="failure"
                    children={undefined}
                />
            </div>
            <div className="col-1"></div>
        </div>
    ) : <></>;

    const infoBar = (
        <div className="row">
            <div className="col-1"></div>
            <div className="col mb-3">
                <DataInfo text={"Match ID: " + matchState.matchID} />
            </div>
            <div className="col mb-3">
                <DataInfo text={"Opponent: " + matchState.opponent} />
            </div>
            <div className="col-1"></div>
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
    } else if (matchState.proposed) {
        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {errorMsg}
                    <div className={err ? "row" : "row mt-5"}>
                        <div className="col-1"></div>
                        <div className="col">
                            <Notice
                                text={"Proposed: " + matchState.stakeProposed + " Gwei"}
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
                    {errorMsg}
                    <div className={err ? "row" : "row mt-5"}>
                        <div className="col-1"></div>
                        <div className="col">
                            <Notice
                                text={"Stake proposed: " + matchState.stakeProposed + " Gwei"}
                                type="info"
                                children={undefined} />
                        </div>
                        <div className="col-1"></div>
                    </div>
                    <div className="row">
                        <div className="col-1"></div>
                        <div className="col container d-flex">
                            <Button
                                text="Confirm"
                                danger={false}
                                disabled={false}
                                onclick={confirmBtnClick} />
                        </div>
                        <div className="col-1"></div>
                    </div>
                    <div className="row text-center mb-5 pt-3">
                        <div className="col pt-4">
                            <span>or</span>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-1"></div>
                        <div className="col mb-3">
                            <TextInputBar
                                id="firstStakeProposalInput"
                                placeholder='Stake Proposal (in Gwei)'
                                leftText='⧫'
                                onchange={stakeHandler}
                                children={<></>} />
                        </div>
                        <div className="col-1">
                            <Button
                                text="Propose"
                                danger={false}
                                disabled={false}
                                onclick={proposeBtnClick} />
                        </div>
                        <div className="col-1"></div>
                    </div>
                </div>
            </TitleBox>
        );
    }
}