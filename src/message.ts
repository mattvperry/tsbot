import User from "./user";

/**
 * Represents an incoming message from the chat.
 */
export class Message {
    /**
     * Room where message came from
     */
    public room: string;
    
    /**
     * Initializes a new instance of the <<Message>> class.
     * @param user A <<User>> instance that sent the message
     * @param done Flag for whether this message is fully processed
     */
    constructor(public user: User, public done: boolean = false) {
        this.room = user["room"];
    }
    
    /**
     * Indicates that no other <<Listener>> should be called on this object.
     */
    public finish(): void {
        this.done = true;
    }
}

/**
 * Represents an incoming message from the chat.
 */
export class TextMessage extends Message {
    /**
     * Initializes a new instance of the <<TextMessage>> class.
     * @param user A <<User>> instance that sent the message
     * @param text A string message
     * @param id A string of the message id
     */
    constructor(public user: User, public text: string, public id: string) {
        super(user);
    }
    
    /**
     * Determines if the message matches the given regex.
     * @param regex A regex to check
     * @returns A match object or null
     */
    public match(regex: string|RegExp): RegExpMatchArray {
        return this.text.match(<any>regex);
    }
    
    /**
     * String representation of a <<TextMessage>>
     * @returns The message text
     */
    public toString(): string {
        return this.text;
    }
}

/**
 * Represents an incoming user entrance notification.
 */
export class EnterMessage extends Message {}

/**
 * Represents an incoming user exit notification.
 */
export class LeaveMessage extends Message {}

/**
 * Represents an incoming topic change notification
 */
export class TopicMessage extends TextMessage {}

/**
 * Represents a message that no matchers matched.
 */
export class CatchAllMessage extends Message {
    /**
     * Initializes a new instance of the <<CatchAllMessage>> class.
     * @param message The original <<Message>>
     */
    constructor(public message: Message) {
        super(message.user);
    }
}