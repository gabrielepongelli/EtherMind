import ethers from "ethers";
import { MatchStateAction } from "../reducers/MatchStateReducer";
import { contract } from "../configs/contract";

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

export const setListener = (topic: ethers.DeferredTopicFilter, distpatchFn: React.Dispatch<MatchStateAction>, actionFn: (args: any[]) => MatchStateAction) => {
    const eventHandler = (event: ethers.ContractEventPayload) => {
        let logMsg = `${event.eventName} event:`;
        const args = event.args.toObject();
        for (const key in args) {
            logMsg += ` ${key}=${args[key]}`
        }
        console.log(logMsg);

        distpatchFn(actionFn(event.args.toArray()));
        contract.off(topic);
    };

    contract.on(topic, eventHandler);
}

export const removeAllListeners = () => {
    contract.removeAllListeners();
}