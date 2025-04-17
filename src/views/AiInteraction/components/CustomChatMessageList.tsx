import React from "react";
import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import { Loader2, User2 } from "lucide-react";
import { Message } from "@ai-sdk/react"; // Import Message type

// Component to render the list of messages
const CustomChatMessagesList: React.FC = () => {
  // Use useChatUI hook to get messages
  const { messages, isLoading, append } = useChatUI();

  return (
    <ChatMessages.List>
      {messages.map((message, index) =>
        message.role === "user" ? (
          <ChatMessage
            key={index}
            message={message}
            isLast={index === messages.length - 1}
            className="items-start rounded-lg m-2" // Added shadow-sm for better visibility
          >
            <ChatMessage.Content
              className="items-end rounded-lg"
              isLoading={isLoading && index === messages.length - 1} // Show loading on the last assistant message
              append={append}
            >
              <ChatMessage.Content.Image />
              <ChatMessage.Content.Markdown />
              <ChatMessage.Content.DocumentFile />
            </ChatMessage.Content>
            <ChatMessage.Avatar>
              <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center">
                <User2 className="h-4 w-4 text-primary" />
              </div>
            </ChatMessage.Avatar>
          </ChatMessage>
        ) : (
          <ChatMessage
            key={index}
            message={message}
            isLast={index === messages.length - 1}
            className="items-start bg-secondary/50 rounded-lg shadow-xl m-2 p-2" // Added shadow-sm for better visibility
          >
            {/* Avatar based on role */}
            <ChatMessage.Avatar>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                {/* You can add an icon or initials here */}
                <span className="text-xs font-semibold">AI</span>
              </div>
            </ChatMessage.Avatar>
            {/* Message content - Removed bg-background, shadow-sm */}
            <ChatMessage.Content
              className="items-start rounded-lg p-0"
              isLoading={isLoading && index === messages.length - 1} // Show loading on the last assistant message
              append={append} // Function to append content (streaming)
            >
              <ChatMessage.Content.Image />
              <ChatMessage.Content.Markdown />
              <ChatMessage.Content.DocumentFile />
            </ChatMessage.Content>
            {/* Optional: Message actions */}
            {/* <ChatMessage.Actions /> */}
          </ChatMessage>
        )
      )}
      {/* Display loading indicator at the end */}
      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <ChatMessage
          // Cast the message object to satisfy the type, content is enough for display
          message={{ role: "assistant", content: "" } as Message}
          isLast={true}
          className="items-start bg-secondary/50 rounded-lg shadow-xl m-2 p-2" // Added shadow-sm for better visibility
        >
          <ChatMessage.Avatar>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
          </ChatMessage.Avatar>
          {/* Loading Message content - Removed bg-background, shadow-sm */}
          <ChatMessage.Content
            className="items-start rounded-lg"
            isLoading={true}
            append={append}
          >
            {/* Placeholder for loading state */}
          </ChatMessage.Content>
        </ChatMessage>
      )}
    </ChatMessages.List>
  );
};

export default CustomChatMessagesList;
