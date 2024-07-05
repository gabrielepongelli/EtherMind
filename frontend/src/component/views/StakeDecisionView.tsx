import React, { useContext, useState, useEffect } from "react";

import { TitleBox } from "../TitleBox";
import { Notice } from "../Notice";
import { Button } from "../Button";
import { DataInfo } from "../DataInfo";
import { TextInputBar } from "../TextInputBar";
import { Spinner } from "../Spinner";

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";

import ethers from "ethers";
import { contract, wallet } from "../../configs/contract";
import { proposeStake } from "../../utils/contractInteraction";

export const StakeDecisionView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);
    const [stake, setStake] = useState<bigint>(BigInt(0));

    useEffect(() => {
        const filterApproved = contract.filters.StakeFixed(matchState.matchID, null);
        const eventApprovedHandler = (event: ethers.ContractEventPayload) => {
            console.log(`StakeFixed event: matchID = ${event.args[0]}, amount = ${event.args[1]}`);

            dispatchMatchState({ type: "stake approved", amount: event.args[1] });
            contract.off(filterApproved);
        };

        if (!matchState.waiting) {
            // wait also for approvals
            contract.on(filterApproved, eventApprovedHandler);
        }

        const filterPropose = contract.filters.StakeProposal(matchState.matchID, null, null);
        const eventProposeHandler = (event: ethers.ContractEventPayload) => {
            console.log(`StakeProposal event: matchID = ${event.args[0]}, by = ${event.args[1]}, stake = ${event.args[2]}`);

            const proposed = event.args[1] === wallet.address;

            dispatchMatchState({ type: "stake proposal", waiting: false, proposed: proposed, amount: event.args[2] });
            contract.off(filterPropose);
        };

        contract.on(filterPropose, eventProposeHandler);
    }, [matchState]);

    const stakeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setStake(BigInt(event.target.value));
    };

    const proposeBtnClick = () => {
        proposeStake(matchState.matchID || "", stake);
        dispatchMatchState({ type: 'stake proposal', waiting: true });
    }

    const confirmBtnClick = () => {
        proposeStake(matchState.matchID || "", matchState.stakeProposed || BigInt(0));
        dispatchMatchState({ type: 'stake proposal', waiting: true });
    }

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
                    <div className="row mt-5">
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
                    <div className="row mt-5">
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