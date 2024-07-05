import { createContext } from 'react';
import { initialMatchState, MatchStateAction } from '../reducers/MatchStateReducer';


export const MatchStateContext = createContext(initialMatchState);

export const MatchStateSetContext = createContext<React.Dispatch<MatchStateAction>>(() => { });