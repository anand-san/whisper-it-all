import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { FC } from "react"; // Removed 'type' as it's used as a value below
import {
  ArrowDownIcon,
  CheckIcon, // Keep CheckIcon
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  SendHorizontalIcon,
  Settings2Icon, // Icon for the trigger button
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useModelSelection } from "../context/ModelSelectionContext"; // Import context hook
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet"; // Import Sheet components
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../../../components/ui/accordion"; // Import Accordion components
import { Button } from "../../../components/ui/button";
import { MarkdownText } from "./markdown-text";
import { TooltipIconButton } from "./tooltip-icon-button";
import { RecorderState } from "../hooks/useAiInteraction";
import RecordingIndicator from "../../../components/RecordingIndicator";
import TranscribingIndicator from "../../../components/TranscribingIndicator";

interface ThreadProps {
  recorderState?: RecorderState; // Add the prop
}

export const Thread: FC<ThreadProps> = ({ recorderState = "idle" }) => {
  // Get model selection state and functions from context
  const {
    selectedModelId,
    setSelectedModelId,
    modelProviders,
    isModelSheetOpen,
    setIsModelSheetOpen,
    getModelNameById,
  } = useModelSelection();

  const selectedModelName =
    getModelNameById(selectedModelId) || selectedModelId;

  return (
    // Wrap the trigger and define the Sheet content
    <Sheet open={isModelSheetOpen} onOpenChange={setIsModelSheetOpen}>
      <ThreadPrimitive.Root
        className="box-border flex h-full w-full flex-col overflow-hidden rounded-md"
        style={{
          ["--thread-max-width" as string]: "42rem",
        }}
      >
        <ThreadPrimitive.Viewport className="flex h-full w-full flex-col items-center overflow-y-scroll scroll-smooth bg-inherit">
          <ThreadWelcome />

          <ThreadPrimitive.Messages
            components={{
              UserMessage: UserMessage,
              EditComposer: EditComposer,
              AssistantMessage: AssistantMessage,
            }}
          />

          <ThreadPrimitive.If empty={false}>
            <div className="min-h-8 flex-grow" />
          </ThreadPrimitive.If>

          <div className="sticky bottom-0 flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end rounded-t-lg bg-inherit pb-2">
            <ThreadScrollToBottom />

            {/* Model Selector Trigger and Composer Area */}
            <div className="flex flex-col items-center w-full max-w-[var(--thread-max-width)] gap-2">
              {recorderState === "recording" && <RecordingIndicator />}
              {recorderState === "transcribing" && <TranscribingIndicator />}
              {recorderState === "idle" && (
                <>
                  {/* Model Selector Trigger Button */}
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      <Settings2Icon className="mr-1 h-3 w-3" />
                      {selectedModelName}
                    </Button>
                  </SheetTrigger>
                  <Composer />
                </>
              )}
            </div>
          </div>
        </ThreadPrimitive.Viewport>

        {/* Sheet Content for Model Selection */}
        <SheetContent
          side="right"
          className="w-[250px] sm:w-[400px] p-0 gap-0 rounded-lg"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Your Models</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <Accordion type="single" collapsible className="w-full">
              {modelProviders.map((provider) => (
                <AccordionItem
                  key={provider.providerName}
                  value={provider.providerName}
                >
                  <AccordionTrigger>
                    <div className="flex items-center justify-start">
                      <img
                        src={provider.image}
                        alt={provider.providerName}
                        className="h-6 w-6 mr-2 rounded-full"
                      />
                      {provider.providerName}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-1 pl-2">
                      {provider.models.map((model) => (
                        <Button
                          key={model.id}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left h-auto py-1.5",
                            selectedModelId === model.id && "bg-accent" // Highlight selected
                          )}
                          onClick={() => {
                            setSelectedModelId(model.id);
                            setIsModelSheetOpen(false); // Close sheet on selection
                          }}
                        >
                          {selectedModelId === model.id && (
                            <CheckIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="flex-1">{model.name}</span>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </SheetContent>
      </ThreadPrimitive.Root>
    </Sheet>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-8 rounded-full disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          <p className="mt-4 font-medium">How can I help you today?</p>
        </div>
        {/* <ThreadWelcomeSuggestions /> */}
      </div>
    </ThreadPrimitive.Empty>
  );
};

// const ThreadWelcomeSuggestions: FC = () => {
//   return (
//     <div className="mt-3 flex w-full items-stretch justify-center gap-4">
//       <ThreadPrimitive.Suggestion
//         className="hover:bg-muted/80 flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border p-3 transition-colors ease-in"
//         prompt="What is the weather in Tokyo?"
//         method="replace"
//         autoSend
//       >
//         <span className="line-clamp-2 text-ellipsis text-sm font-semibold">
//           What is the weather in Tokyo?
//         </span>
//       </ThreadPrimitive.Suggestion>
//       <ThreadPrimitive.Suggestion
//         className="hover:bg-muted/80 flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border p-3 transition-colors ease-in"
//         prompt="What is assistant-ui?"
//         method="replace"
//         autoSend
//       >
//         <span className="line-clamp-2 text-ellipsis text-sm font-semibold">
//           What is assistant-ui?
//         </span>
//       </ThreadPrimitive.Suggestion>
//     </div>
//   );
// };

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="focus-within:border-ring/20 flex w-full flex-wrap items-end rounded-lg border bg-background/80 px-2.5 shadow-sm transition-colors ease-in">
      <ComposerPrimitive.Input
        rows={1}
        autoFocus
        placeholder="Write a message..."
        className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
      />
      <ComposerAction />
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
          >
            <SendHorizontalIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton
            tooltip="Cancel"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
          >
            <CircleStopIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 [&:where(>*)]:col-start-2 w-full max-w-[var(--thread-max-width)] py-4">
      <UserActionBar />

      <div className="bg-muted/60 text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5 col-start-2 row-start-2">
        <MessagePrimitive.Content />
      </div>

      <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex flex-col items-end col-start-1 row-start-2 mr-3 mt-2.5"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="bg-muted my-4 flex w-full max-w-[var(--thread-max-width)] flex-col gap-2 rounded-xl">
      <ComposerPrimitive.Input className="text-foreground flex h-8 w-full resize-none bg-transparent p-4 pb-0 outline-none" />

      <div className="mx-3 mb-3 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost">Cancel</Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button>Send</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] relative w-full max-w-[var(--thread-max-width)] py-4">
      <div className="bg-muted/90 text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5 pb-4 col-start-2 row-start-2 relative">
        <MessagePrimitive.Content components={{ Text: MarkdownText }} />
        <AssistantActionBar />
      </div>

      <BranchPicker className="col-start-2 row-start-2 -ml-2 mr-2" />
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="always"
      autohideFloat="single-branch"
      className="text-muted-foreground flex gap-1 absolute bottom-0 right-3 translate-y-1/2 bg-muted/70 rounded-full py-1 px-2"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "text-muted-foreground inline-flex items-center text-xs",
        className
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const CircleStopIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      width="16"
      height="16"
    >
      <rect width="10" height="10" x="3" y="3" rx="2" />
    </svg>
  );
};
