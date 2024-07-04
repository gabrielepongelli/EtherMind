import React from 'react';

interface NoticeProps {
    text: string; // The text to display inside the notice
    type: 'info' | 'success' | 'failure'; // The type of notice
    copyBtn: React.ReactElement; // A copy button
}

export const Notice: React.FC<NoticeProps> = ({ text, type, copyBtn }) => {

    const alertClass = (): string => {
        switch (type) {
            case 'info':
                return "alert alert-primary";
            case 'success':
                return "alert alert-success";
            case 'failure':
                return "alert alert-danger";
        }
    }

    return (
        <div
            className={alertClass()}
            role='alert'
        >
            <span>
                {text}
            </span>
            <div
                className='container d-flex'
                style={{ justifyContent: 'flex-end' }}
            >
                {copyBtn}
            </div>
        </div >
    );
}