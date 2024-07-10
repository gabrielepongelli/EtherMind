import React, { useContext } from "react";

import { Notice } from "../Notice";
import { Button } from "../Button";
import { DataInfo } from "../DataInfo";
import { TitleBox } from "../TitleBox";

import { MatchStateContext, MatchStateSetContext } from "../../contexts/MatchStateContext";

export const EndView: React.FC = () => {
    const matchState = useContext(MatchStateContext);
    const dispatchMatchState = useContext(MatchStateSetContext);

    const onHomeBtnClick = () => {
        dispatchMatchState({ type: "reset" });
    }

    const matchEndedGenuinely = matchState.punished === undefined;
    const scoresInfo = matchEndedGenuinely
        ? (
            <div className="row justify-content-center mb-5">
                <div className="col">
                    <DataInfo
                        text={"Your Score: " + (matchState.yourFinalScore as number).toString()}
                    />
                </div>
                <div className="col">
                    <DataInfo
                        text={"Opponent Score: " + (matchState.opponentFinalScore as number).toString()}
                    />
                </div>
            </div>
        )
        : (<></>);

    const infoBar = (
        <div>
            <div className={"row justify-content-center" + (matchEndedGenuinely ? "" : " mb-5")}>
                <div className="col">
                    <DataInfo text={"Match ID: " + matchState.matchID} />
                </div>
                <div className="col">
                    <DataInfo text={"Stake: " + matchState.stakeProposed + " Gwei"} />
                </div>
                <div className="col">
                    <DataInfo text={"Opponent: " + matchState.opponent} />
                </div>
            </div>
            {scoresInfo}
        </div>
    );

    const homeBtn = (
        <div className="row">
            <div className="col"></div>
            <div className="col">
                <Button
                    text="Home"
                    danger={false}
                    disabled={false}
                    onclick={onHomeBtnClick}
                />
            </div>
            <div className="col"></div>
        </div>
    );

    if (matchEndedGenuinely) {
        let notice = (<></>);
        if (matchState.yourFinalScore == matchState.opponentFinalScore) {
            notice = (
                <Notice
                    text="It's a draw."
                    type="info"
                    children={<></>}
                />
            );
        } else if ((matchState.yourFinalScore as number) >= (matchState.opponentFinalScore as number)) {
            notice = (
                <Notice
                    text={"You won " + (Number((matchState.stakeProposed as bigint)) * 2).toString() + " Gwei!"}
                    type="success"
                    children={<></>}
                />
            );
        } else {
            notice = (
                <Notice
                    text={"You lost.."}
                    type="failure"
                    children={<></>}
                />
            );
        }

        return (
            <TitleBox>
                <div>
                    {infoBar}
                    {notice}
                    {homeBtn}
                </div>
            </TitleBox>
        );
    } else if (matchState.punished) {
        const errorMsg = !matchState.endMsg?.includes("AFK")
            ? matchState.endMsg?.replace("Player", "You").replace("the", "your")
            : "You were AFK for too long.";

        return (
            <TitleBox>
                <div>
                    {infoBar}
                    <Notice
                        text={errorMsg as string}
                        type="failure"
                        children={<></>}
                    />
                    <Notice
                        text="The match is ended, and the stake has been entirely transferred to your opponent."
                        type="info"
                        children={<></>}
                    />
                    {homeBtn}
                </div>
            </TitleBox>
        );
    } else {
        const errorMsg = (!matchState.endMsg?.includes("AFK")
            ? "You have been unjustly accused."
            : "Your opponent is AFK.") + " The match is ended, and the stake has been entirely transferred to you.";

        return (
            <TitleBox>
                <div>
                    {infoBar}
                    <Notice
                        text={errorMsg}
                        type="info"
                        children={<></>}
                    />
                    {homeBtn}
                </div>
            </TitleBox>
        );
    }
}