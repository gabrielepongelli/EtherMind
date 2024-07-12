import React, { useContext, useState, useEffect } from 'react';

import { Button } from '../Button';
import { TextInputBar } from '../TextInputBar';
import { TitleBox } from "../TitleBox";
import { Spinner } from '../Spinner';
import { Notice } from '../Notice';

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";

import { joinMatch } from '../../utils/contractInteraction';
import { contract, wallet } from '../../configs/contract';
import { setListener, removeAllListeners } from '../../utils/utils';

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

        const filter = contract.filters.MatchStarted(null, null, wallet.address);
        setListener(filter, (args) => {
            dispatchMatchState({
                type: 'started',
                matchId: args[0],
                opponent: args[1],
                joiner: true
            });
        });

        return removeAllListeners;
    }, [matchState.waiting]);

    const errorMsg = matchState.error === undefined ? <></> : (
        <Notice
            text={matchState.error}
            type="failure"
            children={undefined}
        />
    );

    let matchIdInput = (<></>);
    if (!matchState.randomJoin) {
        matchIdInput = (
            <div className="mb-3">
                <TextInputBar
                    placeholder='Match ID'
                    leftText='0x'
                    onchange={matchIDHandler}
                    children={<></>} />
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
                    <div className="mb-3">
                        <TextInputBar
                            placeholder='Stake Proposal (in Wei)'
                            leftText='⧫'
                            onchange={stakeHandler}
                            children={<></>} />
                    </div>
                    <div className='row'>
                        <div className='col-auto'>
                            <Button
                                text="Join"
                                danger={false}
                                disabled={false}
                                onclick={onJoinBtnClick} />
                        </div>
                        <div className='col'></div>
                    </div>
                </div>
            </TitleBox>
        );
    }
}