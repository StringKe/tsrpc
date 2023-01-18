export function getClassObjectId(): { new (id?: any): any } {
    let classObjId: any
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        classObjId = require('mongodb').ObjectId
    } catch {
        // do nothing
    }

    if (!classObjId) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            classObjId = require('bson').ObjectId
        } catch {
            // do nothing
        }
    }

    if (!classObjId) {
        classObjId = String
    }

    return classObjId
}
