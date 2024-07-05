import React from "react";

interface DataInfoProps {
    text: string; // The text to display inside the notice
}

export const DataInfo: React.FC<DataInfoProps> = ({ text }) => {
    return (
        <input type="text" className="form-control" placeholder={text} disabled={true}></input>
    );
}