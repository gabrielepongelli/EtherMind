import React from "react";

interface DataInfoProps {
    text: string; // The text to display inside the notice
}

export const DataInfo: React.FC<DataInfoProps> = ({ text }) => {
    return (
        <p className="form-control flex-grow-1 text-nowrap bg-body-secondary">{text}</p>
    );
}