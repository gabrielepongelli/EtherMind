import React, { useReducer } from 'react';

import { HomeView } from './component/views/HomeView';
import { CreateMatchView } from './component/views/CreateMatchView';
import { JoinMatchView } from './component/views/JoinMatchView';
import { StakeDecisionView } from './component/views/StakeDecisionView';

import { MatchStateContext, MatchStateSetContext } from './contexts/MatchStateContext';
import { initialMatchState, matchStateReducer } from './reducers/MatchStateReducer';

import { Phase } from './utils/generalTypes';

const App: React.FC = () => {
    const [matchState, dispatchMatchState] = useReducer(matchStateReducer, initialMatchState)

    switch (matchState.phase) {
        case Phase.START:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <HomeView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );

        case Phase.CREATING_MATCH:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <CreateMatchView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );
        case Phase.JOINING_MATCH:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <JoinMatchView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );
        case Phase.STAKE_DECISION:
            return (
                <MatchStateContext.Provider value={matchState}>
                    <MatchStateSetContext.Provider value={dispatchMatchState}>
                        <StakeDecisionView />
                    </MatchStateSetContext.Provider>
                </MatchStateContext.Provider>
            );
    }
};

export default App;
