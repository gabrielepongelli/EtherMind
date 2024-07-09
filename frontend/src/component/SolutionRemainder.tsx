import React from "react";

import { GuessViewer } from "./GuessViewer";

import { Code } from "../utils/generalTypes";

interface SolutionRemainderProps {
    solution: Code
}

export const SolutionRemainder: React.FC<SolutionRemainderProps> = ({ solution }) => {
    return (
        <div className="accordion mb-4" id="solutionRemainder">
            <div className="accordion-item" key={0}>
                <h2 className="accordion-header">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#solution" aria-expanded="false" aria-controls="solution">
                        <div className="container-fluid text-center">
                            Solution
                        </div>
                    </button>
                </h2>
                <div id="solution" className="accordion-collapse collapse" data-bs-parent="#solutionRemainder">
                    <div className="accordion-body">
                        <div className="mt-3 mb-4">
                            <GuessViewer
                                title=""
                                guess={solution}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}