import { createContext } from 'react';
import { initialGameState, GameStateAction } from '../reducers/GameStateReducer';


export const GameStateContext = createContext(initialGameState);

export const GameStateSetContext = createContext<React.Dispatch<GameStateAction>>(() => { });