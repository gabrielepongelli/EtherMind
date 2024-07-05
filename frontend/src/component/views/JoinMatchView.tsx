import React, { useContext } from 'react';

import { Button } from '../Button';
import { TextInputBar } from '../TextInputBar';
import { TitleBox } from "../TitleBox";
import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";

export const JoinMatchView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);

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
                        children={<></>} />
                </div>
                <div className="col"></div>
            </div>
        );
    }

    return (
        <TitleBox>
            <div>
                {matchIdInput}
                <div className="row">
                    <div className="col"></div>
                    <div className="col-6 mb-3">
                        <TextInputBar
                            id="firstStakeProposalInput"
                            placeholder='Stake Proposal (in Gwei)'
                            leftText='⧫'
                            children={<></>} />
                    </div>
                    <div className="col"></div>
                </div>
                <div className="row">
                    <div className="col"></div>
                    <div className="col-1">
                        <Button text="Join" danger={false} disabled={false} onclick={() => { }} />
                    </div>
                    <div className="col-5"></div>
                    <div className="col"></div>
                </div>
            </div>
        </TitleBox>
    );
}