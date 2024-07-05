import React from 'react';

interface NoticeProps {
    text: string; // The text to display inside the notice
    type: 'info' | 'success' | 'failure'; // The type of notice
    children: React.ReactElement | undefined; // A copy button
}

export const Notice: React.FC<NoticeProps> = ({ text, type, children }) => {
    const justify = children === undefined ? 'center' : 'between';

    const alertClass = (): string => {
        switch (type) {
            case 'info':
                return "alert alert-primary d-flex justify-content-" + justify;
            case 'success':
                return "alert alert-success d-flex justify-content-" + justify;
            case 'failure':
                return "alert alert-danger d-flex justify-content-" + justify;
        }
    }

    return (
        <div
            className={alertClass()}
            role='alert'
        >
            <span>{text}</span>
            <div>
                {children}
            </div>
        </div>
    );
}