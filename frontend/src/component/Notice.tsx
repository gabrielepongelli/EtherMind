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
            <div className={'row justify-content-' + justify}>
                <span className='col text-center'>{text}</span>
                <div className='col-1'>
                    {children}
                </div>
            </div>
        </div>
    );
}