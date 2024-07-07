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
        setListener(filter, dispatchMatchState, (args) => {
            return { type: 'created', waiting: false, matchId: args[0] };
        });

        return removeAllListeners;
    }, []);

    useEffect(() => {
        const filter = contract.filters.MatchStarted(matchState.matchID);
        setListener(filter, dispatchMatchState, (args) => {
            return { type: 'started', matchId: args[0], opponent: args[2], joiner: false };
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

    if (matchState.waiting) {
        return (
            <TitleBox><Spinner /></TitleBox>
        );
    } else if (matchState.matchID !== undefined) {
        return (
            <TitleBox>
                <div>
                    {errorMsg}
                    <div className="row">
                        <div className="col"></div>
                        <div className="col-6">
                            <Notice
                                text={"Match ID: " + matchState.matchID}
                                type="info"
                            >
                                <CopyIcon onclick={handleCopyIconClick} />
                            </Notice>
                        </div>
                        <div className="col"></div>
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
                    {errorMsg}
                    <div className="row">
                        <div className="col"></div>
                        <div className="col-6 mb-3">
                            <TextInputBar
                                id="guestAddressInput"
                                placeholder='Guest Address (Optional)'
                                leftText='0x'
                                children={<></>}
                                onchange={handlePlayerAddressInputChange} />
                        </div>
                        <div className="col"></div>
                    </div>
                    <div className="row">
                        <div className="col"></div>
                        <div className="col-1">
                            <Button
                                text="Create"
                                danger={false}
                                disabled={false}
                                onclick={onCreateBtnClick} />
                        </div>
                        <div className="col-5"></div>
                        <div className="col"></div>
                    </div>
                </div>
            </TitleBox>
        );
    }
}