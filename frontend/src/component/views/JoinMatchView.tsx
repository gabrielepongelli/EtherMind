import React, { useContext, useState, useEffect } from 'react';

import { Button } from '../Button';
import { TextInputBar } from '../TextInputBar';
import { TitleBox } from "../TitleBox";
import { Spinner } from '../Spinner';
import { Notice } from '../Notice';

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";

import ethers from 'ethers';
import { joinMatch } from '../../utils/contractInteraction';
import { contract, wallet } from '../../configs/contract';

export const JoinMatchView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);
    const [matchID, setMatchID] = useState("");
    const [stake, setStake] = useState("");

    const matchIDHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMatchID(event.target.value);
    };

    const stakeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setStake(event.target.value);
    };

    const onJoinBtnClick = () => {
        joinMatch(matchID, stake)
            .then((result) => {
                if (!result.success) {
                    dispatchMatchState({ type: 'error', msg: result.error });
                }
            });
        dispatchMatchState({ type: 'joining', waiting: true });
    }

    useEffect(() => {
        if (!matchState.waiting) {
            return;
        }

        const eventHandler = (event: ethers.ContractEventPayload) => {
            console.log(`MatchStarted event: matchID = ${event.args[0]}, creator = ${event.args[1]}, challenger = ${event.args[2]}`);

            dispatchMatchState({ type: 'started', matchId: event.args[0], opponent: event.args[1] });
            contract.off(filter);
        };

        const filter = contract.filters.MatchStarted(null, null, wallet.address);
        contract.on(filter, eventHandler);
    }, [matchState.waiting]);

    const errorMsg = matchState.error === undefined ? <></> : (
        <div className="row">
            <div className="col"></div>
            <div className="col-6">
                <Notice
                    text={matchState.error}
                    type="failure"
                    children={undefined}
                />
            </div>
            <div className="col"></div>
        </div>
    );

    let matchIdInput = (<></>);
    if (!matchState.randomJoin) {
        matchIdInput = (
            <div className="row">
                <div className="col"></div>
                <div className="col-6 mb-3">
                    <TextInputBar
                        id="matchIdInput"
                        placeholder='Match ID'
                        leftText='0x'
                        onchange={matchIDHandler}
                        children={<></>} />
                </div>
                <div className="col"></div>
            </div>
        );
    }

    if (matchState.waiting) {
        return (
            <TitleBox><Spinner /></TitleBox>
        );
    } else {
        return (
            <TitleBox>
                <div>
                    {errorMsg}
                    {matchIdInput}
                    <div className="row">
                        <div className="col"></div>
                        <div className="col-6 mb-3">
                            <TextInputBar
                                id="firstStakeProposalInput"
                                placeholder='Stake Proposal (in Gwei)'
                                leftText='⧫'
                                onchange={stakeHandler}
                                children={<></>} />
                        </div>
                        <div className="col"></div>
                    </div>
                    <div className="row">
                        <div className="col"></div>
                        <div className="col-1">
                            <Button
                                text="Join"
                                danger={false}
                                disabled={false}
                                onclick={onJoinBtnClick} />
                        </div>
                        <div className="col-5"></div>
                        <div className="col"></div>
                    </div>
                </div>
            </TitleBox>
        );
    }
}