import React, { useReducer } from 'react';

import { HomeView } from './component/views/HomeView';
import { CreateMatchView } from './component/views/CreateMatchView';
import { JoinMatchView } from './component/views/JoinMatchView';
import { StakeDecisionView } from './component/views/StakeDecisionView';
import { StakePaymentView } from './component/views/StakePaymentView';
import { PlayView } from './component/views/PlayView';
import { EndView } from './component/views/EndView';

import { MatchStateContext, MatchStateSetContext } from './contexts/MatchStateContext';
import { initialMatchState, matchStateReducer } from './reducers/MatchStateReducer';

import { MatchPhase } from './utils/generalTypes';

const App: React.FC = () => {
    const [matchState, dispatchMatchState] = useReducer(matchStateReducer, initialMatchState)

    switch (matchState.phase) {
        case MatchPhase.START:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <HomeView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );

        case MatchPhase.CREATING_MATCH:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <CreateMatchView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );
        case MatchPhase.JOINING_MATCH:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <JoinMatchView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );
        case MatchPhase.STAKE_DECISION:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <StakeDecisionView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );
        case MatchPhase.STAKE_PAYMENT:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <StakePaymentView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );
        case MatchPhase.GAME_STARTED:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <PlayView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );
        case MatchPhase.GAME_ENDED:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <EndView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );
    }
};

export default App;
