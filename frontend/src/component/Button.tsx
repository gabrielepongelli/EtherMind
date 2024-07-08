import React from 'react';

interface ButtonProps {
    text: string; // The text to display inside the button
    danger: boolean; // Whether this is a button representing a dangerous operation
    onclick: React.MouseEventHandler<HTMLButtonElement>; // Callback on button click
    disabled: boolean; // Whether the button can be interacted with
}

export const Button: React.FC<ButtonProps> = ({ text, danger, onclick, disabled }) => {
    return (
        <button
            type="button"
            className={danger ? "btn btn-danger container-fluid" : "btn btn-primary container-fluid"}
            onClick={onclick}
            disabled={disabled}
        >
            <span className='fw-bold'>
                {text}
            </span>
        </button>
    );
}