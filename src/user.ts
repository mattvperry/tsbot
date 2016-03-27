/**
 * Represents a participating user in the chat.
 */
export default class User {
    /**
     * The user's name
     */
    public name: string;

    /**
     * Initializes a new instance of the <<User>> class.
     * @param _id A unique ID for the user.
     * @param options An optional hash of key, value pairs for this user.
     */
    constructor(public id: any, options: { [k: string]: string } = {}) {
        for (let k in options) {
            this[k] = options[k];
        }
        this.name = this.name || this.id.toString();
    }
}