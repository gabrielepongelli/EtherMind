import React from "react";

import { DataInfo } from "./DataInfo";

import { Code } from "../utils/generalTypes";
import { COLOR_CODES } from "../configs/constants";

interface GuessViewerProps {
    title: string
    guess: Code
}

export const GuessViewer: React.FC<GuessViewerProps> = ({ title, guess }) => {
    return (
        <div>
            <div className="text-center mb-4">{title}</div>
            <div className="row text-center">
                <div className="col">
                    <DataInfo
                        text={COLOR_CODES[guess.c1].color}
                    />
                </div>
                <div className="col">
                    <DataInfo
                        text={COLOR_CODES[guess.c2].color}
                    />
                </div>
                <div className="col">
                    <DataInfo
                        text={COLOR_CODES[guess.c3].color}
                    />
                </div>
                <div className="col">
                    <DataInfo
                        text={COLOR_CODES[guess.c4].color}
                    />
                </div>
            </div>
        </div>
    );
}