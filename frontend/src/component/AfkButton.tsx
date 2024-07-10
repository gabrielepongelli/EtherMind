import React, { useContext, useEffect, useState } from "react";

import { Button } from "./Button";

import { MatchStateContext } from "../contexts/MatchStateContext";

import { AFKcheck, HaltGame } from "../utils/contractInteraction";

import { AFK_TIMEOUT } from "../configs/constants";

interface AfkButtonProps {
    phase: any
    disabled?: boolean
    onStartSuccess?: () => void
    onStartFailed?: (err: string) => void
    onTerminateSuccess?: () => void
    onTerminateFailed?: (err: string) => void
}

export const AfkButton: React.FC<AfkButtonProps> = (props) => {
    const matchState = useContext(MatchStateContext);

    const [text, setText] = useState("Check AFK");
    const [disabled, setDisabled] = useState(props.disabled || false);
    const [hasWaited, setHasWaited] = useState(false);
    const [timer, setTimer] = useState<NodeJS.Timeout | undefined>(undefined);

    const resetButton = () => {
        setText("Check AFK");
        setDisabled(props.disabled || false);
        setHasWaited(false);
        clearInterval(timer);
        setTimer(undefined);
    }

    const onTimerExpired = () => {
        setText("Stop");
        setDisabled(props.disabled || false);
        setHasWaited(true);
        clearInterval(timer);
        setTimer(undefined);
    }

    useEffect(() => {
        resetButton();
    }, [props.phase])

    useEffect(() => {
        return () => clearInterval(timer);
    }, [])

    const onClick = () => {
        if (hasWaited) {
            HaltGame(matchState.matchID as string).then((result) => {
                if (!result.success) {
                    props.onTerminateFailed
                        ? props.onTerminateFailed(result.error as string)
                        : () => { };
                } else {
                    props.onTerminateSuccess
                        ? props.onTerminateSuccess()
                        : () => { };
                }
            });
        } else {
            AFKcheck(matchState.matchID as string).then((result) => {
                if (!result.success) {
                    props.onStartFailed
                        ? props.onStartFailed(result.error as string)
                        : () => { };
                } else {
                    setText("Checking..");
                    setDisabled(true);
                    setTimer(setInterval(onTimerExpired, AFK_TIMEOUT * 1000));
                    props.onStartSuccess
                        ? props.onStartSuccess()
                        : () => { };
                }
            });
        }
    }

    return (
        <Button
            text={text}
            danger={true}
            disabled={disabled}
            onclick={onClick}
        />
    );
}