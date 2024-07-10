import React from "react";

interface AlertProps {
    title: string
    type: "info" | "danger" | "none"
    closeBtnText: string
    onClose: () => void
    children: React.ReactNode
}

export const Alert: React.FC<AlertProps> = (props) => {
    let closeBtnClass = "";
    let background = "";
    if (props.type == "info") {
        closeBtnClass = "btn-primary";
    } else if (props.type == "danger") {
        closeBtnClass = "btn-danger";
        background = "bg-danger-subtle";
    } else {
        closeBtnClass = "btn-secondary";
    }


    return (
        <div className="modal position-fixed d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div className={"modal-content " + background}>
                    <div className="modal-header" style={{ border: "none" }}>
                        <h1 className="modal-title fs-5">{props.title}</h1>
                    </div>
                    <div className="modal-body">
                        {props.children}
                    </div>
                    <div className="modal-footer" style={{ border: "none" }}>
                        <button type="button" className={"btn " + closeBtnClass} onClick={props.onClose}>{props.closeBtnText}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}