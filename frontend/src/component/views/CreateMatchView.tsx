import React, { useContext, useEffect, useState } from 'react';

import { Button } from '../Button';
import { TextInputBar } from '../TextInputBar';
import { TitleBox } from "../TitleBox";
import { Notice } from '../Notice';
import { Spinner } from '../Spinner';
import { CopyIcon } from '../CopyIcon';

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";

import ethers from 'ethers';
import { createMatch } from '../../utils/contractInteraction';
import { contract, wallet } from '../../configs/contract';

export const CreateMatchView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);
    const [playerAddress, setplayerAddress] = useState("");

    const handleCopyIconClick = async () => {
        await navigator.clipboard.writeText(matchState.matchID || "");
    };

    useEffect(() => {
        const eventHandler = (event: ethers.ContractEventPayload) => {
            console.log(`MatchCreated event: matchID = ${event.args[0]}, by = ${event.args[1]}`);

            dispatchMatchState({ type: 'created', waiting: false, matchId: event.args[0] });
            contract.off(filter);
        };

        const filter = contract.filters.MatchCreated(null, wallet.address);
        contract.on(filter, eventHandler);
    }, []);

    useEffect(() => {
        const eventHandler = (event: ethers.ContractEventPayload) => {
            console.log(`MatchStarted event: matchID = ${event.args[0]}, creator = ${event.args[1]}, challenger = ${event.args[2]}`);

            dispatchMatchState({ type: 'started', matchId: event.args[0], opponent: event.args[2] });
            contract.off(filter);
        };

        const filter = contract.filters.MatchStarted(matchState.matchID);
        contract.on(filter, eventHandler);
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