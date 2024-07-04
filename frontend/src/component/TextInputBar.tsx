import React from "react";

interface TextInputBarProps {
    id: string; // the id of the input
    placeholder: string; // the placeholder to show
    leftText: string; // optional text to put on the left inside a gray box
    children: React.ReactElement; // a button to be placed on the right
}

export const TextInputBar: React.FC<TextInputBarProps> = ({ id, placeholder, leftText, children }) => {
    return (
        <div className="input-group">
            {leftText ? <span className="input-group-text">{leftText}</span> : null}
            <input
                id={id}
                type="text"
                className="form-control"
                placeholder={placeholder ? placeholder : ""}>
            </input>
            <div>
                {children}
            </div>
        </div>
    );
}