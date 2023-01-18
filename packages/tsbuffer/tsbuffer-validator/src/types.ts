/** @public */
export type ValidateOutput =
    | { isSucc: true; errMsg?: undefined }
    | { isSucc: false; errMsg: string } /** @public */
/** @public */
export type PruneOutput<T> =
    | { isSucc: true; pruneOutput: T; errMsg?: undefined }
    | { isSucc: false; errMsg: string; pruneOutput?: undefined }
