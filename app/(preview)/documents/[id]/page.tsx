"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Message } from "ai";
import { useChat } from "ai/react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown, { Options } from "react-markdown";
import React from "react";
import { LoadingIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useParams } from 'next/navigation'

type Doc = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
};

export default function DocumentView() {
  const params = useParams();
  const id = params.id as string;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const fetchDoc = async () => {
      const res = await fetch(`/api/documents?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setDoc(data.document);
      }
    };
    if (id) {
        fetchDoc();
    }
  }, [id]);

  return (
    <div className="flex flex-col h-screen w-full dark:bg-neutral-900">
      <header className="flex items-center justify-between p-4 border-b dark:border-neutral-800">
        <Link href="/" className="flex items-center gap-2">
            <Button variant="secondary">Back to Documents</Button>
        </Link>
        <h1 className="text-lg font-bold truncate">{doc?.name}</h1>
        <Button onClick={() => setChatOpen(!chatOpen)} variant="secondary">
          {chatOpen ? "Close Chat" : "Open Chat"}
        </Button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {doc ? (
            <iframe src={doc.url} className="w-full h-full" allow="fullscreen" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <LoadingIcon className="animate-spin" />
            </div>
          )}
        </div>
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 400 }}
              exit={{ width: 0 }}
              className="bg-neutral-100 dark:bg-neutral-800 overflow-hidden"
            >
              <ChatPanel documentId={id} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChatPanel({ documentId }: { documentId: string }) {
  const [toolCall, setToolCall] = useState<string>();
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      maxSteps: 4,
      body: { documentId: documentId },
      onToolCall({ toolCall }) {
        setToolCall(toolCall.toolName);
      },
      onError: (error) => {
        toast.error("You've been rate limited, please try again later!");
      },
    });

  const currentToolCall = useMemo(() => {
    const tools = messages?.slice(-1)[0]?.toolInvocations;
    if (tools && toolCall === tools[0].toolName) {
      return tools[0].toolName;
    } else {
      return undefined;
    }
  }, [toolCall, messages]);

  const awaitingResponse = useMemo(() => {
    if (
      isLoading &&
      currentToolCall === undefined &&
      messages.slice(-1)[0].role === "user"
    ) {
      return true;
    } else {
      return false;
    }
  }, [isLoading, currentToolCall, messages]);

  const userQuery: Message | undefined = messages
    .filter((m) => m.role === "user")
    .slice(-1)[0];

  const lastAssistantMessage: Message | undefined = messages
    .filter((m) => m.role !== "user")
    .slice(-1)[0];

  return (
    <div className="flex flex-col h-full p-4">
        <div className="flex-1 overflow-y-auto pb-4">
            {messages.map((m, index) => (
            <div key={index} className="my-2">
                <div className="dark:text-neutral-400 text-neutral-500 text-sm w-fit mb-1">
                {m.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <AssistantMessage message={m} />
            </div>
            ))}
            <AnimatePresence>
                {awaitingResponse || currentToolCall ? (
                <div className="px-2 min-h-12">
                    <div className="dark:text-neutral-400 text-neutral-500 text-sm w-fit mb-1">
                    {userQuery.content}
                    </div>
                    <Loading tool={currentToolCall} />
                </div>
                ) : null}
            </AnimatePresence>
        </div>
        <form onSubmit={handleSubmit} className="flex space-x-2 pt-4 border-t dark:border-neutral-700">
            <Input
            className={`bg-neutral-100 text-base w-full text-neutral-700 dark:bg-neutral-700 dark:placeholder:text-neutral-400 dark:text-neutral-300`}
            minLength={3}
            required
            value={input}
            placeholder={"Ask me anything..."}
            onChange={handleInputChange}
            />
        </form>
    </div>
  );
}

const AssistantMessage = ({ message }: { message: Message | undefined }) => {
    if (message === undefined) return null;
  
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={message.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="whitespace-pre-wrap font-mono anti text-sm text-neutral-800 dark:text-neutral-200 overflow-hidden"
          id="markdown"
        >
          <MemoizedReactMarkdown
            className={"max-h-72 overflow-y-scroll no-scrollbar-gutter"}
          >
            {message.content}
          </MemoizedReactMarkdown>
        </motion.div>
      </AnimatePresence>
    );
  };
  
  const Loading = ({ tool }: { tool?: string }) => {
    const toolName =
      tool === "getInformation"
        ? "Getting information"
        : tool === "addResource"
          ? "Adding information"
          : "Thinking";
  
    return (
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring" }}
          className="overflow-hidden flex justify-start items-center"
        >
          <div className="flex flex-row gap-2 items-center">
            <div className="animate-spin dark:text-neutral-400 text-neutral-500">
              <LoadingIcon />
            </div>
            <div className="text-neutral-500 dark:text-neutral-400 text-sm">
              {toolName}...
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };
  
  const MemoizedReactMarkdown: React.FC<Options> = React.memo(
    ReactMarkdown,
    (prevProps, nextProps) =>
      prevProps.children === nextProps.children &&
      prevProps.className === nextProps.className,
  );