import React, { useContext, useEffect, useState } from 'react';

import { Button } from '../Button';
import { TextInputBar } from '../TextInputBar';
import { TitleBox } from "../TitleBox";
import { Notice } from '../Notice';
import { Spinner } from '../Spinner';
import { CopyIcon } from '../CopyIcon';

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";

import { createMatch } from '../../utils/contractInteraction';
import { contract, wallet } from '../../configs/contract';
import { setListener, removeAllListeners } from '../../utils/utils';

export const CreateMatchView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);
    const [playerAddress, setplayerAddress] = useState("");

    const handleCopyIconClick = async () => {
        await navigator.clipboard.writeText(matchState.matchID || "");
    };

    useEffect(() => {
        const filter = contract.filters.MatchCreated(null, wallet.address);
        setListener(filter, (args) => {
            dispatchMatchState({
                type: 'created',
                waiting: false,
                matchId: args[0]
            });
        });

        return removeAllListeners;
    }, []);

    useEffect(() => {
        const filter = contract.filters.MatchStarted(matchState.matchID);
        setListener(filter, (args) => {
            dispatchMatchState({
                type: 'started',
                matchId: args[0],
                opponent: args[2],
                joiner: false
            });
        });

        return removeAllListeners;
    }, []);

    const handlePlayerAddressInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setplayerAddress(event.target.value);
    };

    const onCreateBtnClick = () => {
        createMatch(playerAddress).then((result) => {
            if (!result.success) {
                dispatchMatchState({ type: 'error', msg: result.error });
            }
        });
        dispatchMatchState({ type: 'created', waiting: true });
    }

    const errorMsg = matchState.error === undefined ? <></> : (
        <Notice
            text={matchState.error}
            type="failure"
            children={undefined}
        />
    );

    if (matchState.waiting) {
        return (
            <TitleBox><Spinner /></TitleBox>
        );
    } else if (matchState.matchID !== undefined) {
        return (
            <TitleBox>
                <div>
                    {errorMsg}
                    <Notice
                        text={"Match ID: " + matchState.matchID}
                        type="info"
                    >
                        <CopyIcon onclick={handleCopyIconClick} />
                    </Notice>
                    <p className='text-center'>Waiting for opponent...</p>
                </div>
            </TitleBox>
        );
    } else {
        return (
            <TitleBox>
                <div>
                    {errorMsg}
                    <div className='mb-3'>
                        <TextInputBar
                            placeholder='Guest Address (Optional)'
                            leftText='0x'
                            children={<></>}
                            onchange={handlePlayerAddressInputChange} />
                    </div>
                    <Button
                        text="Create"
                        danger={false}
                        disabled={false}
                        onclick={onCreateBtnClick} />
                </div>
            </TitleBox>
        );
    }
}