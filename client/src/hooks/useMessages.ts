import { useState, useRef } from "react";
import { v4 } from "uuid";

export interface Message {
  type: "message" | "error";
  message: string | JSX.Element;
  id: string;
  persist: boolean;
  allowRemove: boolean;
}

export type AddMessageParams = {
  type: "message" | "error";
  message: string | JSX.Element;
  persist?: boolean;
  timeout?: number;
  allowRemove?: boolean;
};

export type AddMessage = (params: AddMessageParams) => string;

export type RemoveMessage = (userId: string) => void;

const useMessages = (): {
  messages: Message[];
  addMessage: AddMessage;
  removeMessage: RemoveMessage;
} => {
  const messagesRef = useRef<Message[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage: AddMessage = ({
    type,
    message,
    persist = false,
    timeout,
    allowRemove = true
  }): string => {
    // max messages -> 20
    if (messages.length >= 20) messagesRef.current = messagesRef.current.slice(1);

    if (!persist) {
      messagesRef.current = messagesRef.current.filter(
        ({ persist }) => persist
      );
    }

    const messageId = v4();
    messagesRef.current = [
      ...messagesRef.current,
      { type, message, id: messageId, persist, allowRemove },
    ];
    setMessages(messagesRef.current);

    // message timeout
    timeout &&
      setTimeout(() => {
        setMessages(
          (messagesRef.current = messagesRef.current.filter(
            ({ id }) => id !== messageId
          ))
        );
      }, timeout);

    return messageId;
  };

  const removeMessage = (messageId: string) => {
    setMessages(
      (messagesRef.current = messagesRef.current.filter(
        ({ id }) => id !== messageId
      ))
    );
  };

  return {
    messages,
    addMessage,
    removeMessage
  };
};

export default useMessages;
