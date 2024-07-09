import ethers from "ethers";
import { MatchStateAction } from "../reducers/MatchStateReducer";
import { contract, provider } from "../configs/contract";

import { COLOR_CODES } from "../configs/constants";
import { Color } from "./generalTypes";

export type Pair<T1, T2> = [T1, T2];

/**
 * Extract a value or raise an exception if it is undefined.
 * @param value Value to extract.
 * @param errorMessage Error message to insert in the exception in case value 
 * is undefined.
 * @throws Error if value is undefined.
 */
export const assertDefined = <T>(value: T | undefined, errorMessage: string = "Value is undefined"): T => {
    if (value === undefined) {
        throw new Error(errorMessage);
    }
    return value;
}

const logEvent = (name: ethers.ContractEventName, args: ethers.ethers.Result) => {
    let logMsg = `${name} event:`;
    const argsObj = args.toObject();
    for (const key in argsObj) {
        logMsg += ` ${key}=${argsObj[key]}`
    }
    console.log(logMsg);
}

export const setListener = <T>(topic: ethers.DeferredTopicFilter, distpatchFn: React.Dispatch<T>, actionFn: (args: any[]) => T) => {
    const eventHandler = (event: ethers.ContractEventPayload) => {
        logEvent(event.eventName, event.args);
        distpatchFn(actionFn(event.args.toArray()));
        contract.off(topic);
    };

    contract.on(topic, eventHandler);
}

export const removeAllListeners = () => {
    contract.removeAllListeners();
}

export const searchEvent = <T>(topic: ethers.DeferredTopicFilter, distpatchFn: React.Dispatch<T>, actionFn: (args: any[]) => T) => {
    const code = async () => {
        provider.getLogs({
            address: await contract.getAddress(),
            topics: await topic.getTopicFilter()
        }).then((logs) => {
            const parsedLog = contract.interface.parseLog(logs[0]);
            if (parsedLog === null) {
                return;
            }

            logEvent(parsedLog.name, parsedLog.args);
            distpatchFn(actionFn(parsedLog.args.toArray()));
        }).catch(() => { });
    };

    code();
}

export const colorToIdx = (color: Color) => {
    return COLOR_CODES.findIndex((c) => { return c.color == color });
}

export const getRandomInt = () => {
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return randomBuffer[0];
}