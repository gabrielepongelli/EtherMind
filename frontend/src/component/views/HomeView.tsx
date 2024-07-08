import React, { useContext } from 'react';

import { Button } from '../Button';
import { TitleBox } from "../TitleBox";
import { MatchStateSetContext } from "../../contexts/MatchStateContext";

export const HomeView: React.FC = () => {
    const dispatchMatchState = useContext(MatchStateSetContext);

    const onCreateBtnClick = () => {
        return dispatchMatchState({ type: "creating" });
    }

    const onRandomJoinBtnClick = () => {
        return dispatchMatchState({ type: "joining", waiting: false, random: true });
    }

    const onIDJoinBtnClick = () => {
        return dispatchMatchState({ type: "joining", waiting: false, random: false });
    }

    return (
        <TitleBox>
            <div>
                <div className='justify-content-center'>
                    <Button
                        text="Create"
                        danger={false}
                        disabled={false}
                        onclick={onCreateBtnClick} />
                </div>
                <p className="my-4 text-center">or</p>
                <div className="row">
                    <div className="col">
                        <Button
                            text="Join with ID"
                            danger={false}
                            disabled={false}
                            onclick={onIDJoinBtnClick} />
                    </div>
                    <div className="col">
                        <Button
                            text="Join Random"
                            danger={false}
                            disabled={false}
                            onclick={onRandomJoinBtnClick} />
                    </div>
                </div>
            </div>
        </TitleBox>
    );
}