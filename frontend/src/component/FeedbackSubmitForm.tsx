import React, { useState } from "react";

import { Button } from "./Button";
import { TextInputBar } from "./TextInputBar";

import { Feedback } from "../utils/generalTypes";

interface FeedbackSubmitFormProps {
    onSubmit: (f?: Feedback) => void
}

export const FeedbackSubmitForm: React.FC<FeedbackSubmitFormProps> = ({ onSubmit }) => {
    const [correctPos, setCorrectPos] = useState("");
    const [wrongPos, setWrongPos] = useState("");
    const [btnDisabled, setBtnDisabled] = useState(true);

    const onCorrectPosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCorrectPos(e.target.value);
        setBtnDisabled(e.target.value == "" || wrongPos == "");
    }

    const onWrongPosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWrongPos(e.target.value);
        setBtnDisabled(e.target.value == "" || correctPos == "");
    }

    const onBtnClick = () => {
        try {
            onSubmit({
                correctPos: Number(correctPos),
                wrongPos: Number(wrongPos)
            });
        } catch (e) {
            onSubmit(undefined);
        }
    }

    return (
        <div>
            <div className="row mb-4">
                <div className="col">
                    <TextInputBar
                        placeholder="Correct Positions"
                        leftText=""
                        onchange={onCorrectPosChange}
                        children={<></>}
                    />
                </div>
                <div className="col">
                    <TextInputBar
                        placeholder="Wrong Positions"
                        leftText=""
                        onchange={onWrongPosChange}
                        children={<></>}
                    />
                </div>
            </div>
            <div className="row">
                <div className="col"></div>
                <div className="col">
                    <Button
                        text="Submit"
                        danger={false}
                        disabled={btnDisabled}
                        onclick={onBtnClick}
                    />
                </div>
                <div className="col"></div>
            </div>
        </div>
    );
}