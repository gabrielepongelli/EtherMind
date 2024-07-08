import React from "react";

import { COLOR_CODES } from "../configs/constants";

interface ColorPickerProps {
    colorIdx: number
    onchange: React.ChangeEventHandler<HTMLSelectElement>
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ colorIdx, onchange }) => {
    let options = [<option value="" key={COLOR_CODES.length}>{"Color " + colorIdx.toString()}</option>];
    for (let i = 0; i < COLOR_CODES.length; i++) {
        const c = COLOR_CODES[i];
        options.push(<option value={c.color} key={i}>{c.color}</option>);
    }

    return (
        <select className="form-select" onChange={onchange} defaultValue="orange">
            {options}
        </select>
    );
}