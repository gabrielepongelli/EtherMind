import React, { useState } from "react";

import { ColorPicker } from "./ColorPicker";
import { Button } from "./Button";
import { Color, Code } from "../utils/generalTypes";
import { colorToIdx } from "../utils/utils";

interface CodeSubmitFormProps {
    onSubmit: (color: Code) => void
}

export const CodeSubmitForm: React.FC<CodeSubmitFormProps> = ({ onSubmit }) => {
    const [btnDisabled, setBtnDisabled] = useState(true);
    const [colorCombo, setColorCombo] = useState<(Color | "")[]>(['', '', '', '']);

    const onChange = (idx: number) => {
        return (e: React.ChangeEvent<HTMLSelectElement>) => {
            let newState = colorCombo.slice(0, idx - 1);
            newState.push(e.target.value as Color);
            newState = newState.concat(colorCombo.slice(idx));

            setColorCombo(newState);

            setBtnDisabled(newState.find((val) => { return val === "" }) !== undefined);
        }
    }

    const onClick = () => {
        onSubmit({
            c1: colorToIdx(colorCombo[0] as Color),
            c2: colorToIdx(colorCombo[1] as Color),
            c3: colorToIdx(colorCombo[2] as Color),
            c4: colorToIdx(colorCombo[3] as Color)
        });
    }

    return (
        <div>
            <div className="row mb-4">
                <div className="col">
                    <ColorPicker colorIdx={1} onchange={onChange(1)} />
                </div>
                <div className="col">
                    <ColorPicker colorIdx={2} onchange={onChange(2)} />
                </div>
                <div className="col">
                    <ColorPicker colorIdx={3} onchange={onChange(3)} />
                </div>
                <div className="col">
                    <ColorPicker colorIdx={4} onchange={onChange(4)} />
                </div>
            </div>
            <div className="row">
                <div className="col"></div>
                <div className="col">
                    <Button
                        text="Submit"
                        danger={false}
                        disabled={btnDisabled}
                        onclick={onClick}
                    />
                </div>
                <div className="col"></div>
            </div>
        </div>
    );
}