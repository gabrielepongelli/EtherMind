import React from "react";

import { TITLE } from '../configs/constants';

interface TitleBoxProp {
    children: React.ReactElement // The content of the box
}

export const TitleBox: React.FC<TitleBoxProp> = ({ children }) => {
    return (
        <div className="container-fluid">
            <div className="text-center py-5 my-5">
                <h1>{TITLE}</h1>
            </div>
            <div className="row">
                <div className="col-1"></div>
                <div className="col-lg-6 container-fluid justify-content-center">
                    {children}
                </div>
                <div className="col-1"></div>
            </div>
        </div>
    );
}