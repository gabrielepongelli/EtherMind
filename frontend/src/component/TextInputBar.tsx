import React from "react";

interface TextInputBarProps {
    placeholder: string; // the placeholder to show
    leftText: string; // optional text to put on the left inside a gray box
    onchange: React.ChangeEventHandler<HTMLInputElement> | undefined // optional callback function
    children: React.ReactElement; // a button to be placed on the right
}

export const TextInputBar: React.FC<TextInputBarProps> = ({ placeholder, leftText, children, onchange }) => {
    return (
        <div className="input-group">
            {leftText ? <span className="input-group-text font-monospace">{leftText}</span> : null}
            <input
                type="text"
                className="form-control"
                placeholder={placeholder ? placeholder : ""}
                onChange={onchange}>
            </input>
            <div>
                {children}
            </div>
        </div>
    );
}