import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../../components/ui/sheet"; // Assuming Sheet components are here
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion"; // Assuming Accordion components are here
import { Button } from "../../../components/ui/button"; // Assuming Button component is here
import { Settings2Icon, CheckIcon } from "lucide-react";
import { cn } from "../../../lib/utils"; // Assuming cn utility is here
import { useModelSelection } from "../context/ModelSelectionContext"; // Import context hook

interface ModelSelectorSheetProps {
  // Add any props if needed, e.g., trigger styling
}

const ModelSelectorSheet: React.FC<ModelSelectorSheetProps> = () => {
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
    getModelNameById(selectedModelId) || selectedModelId || "Select Model"; // Default text

  return (
    // Wrap the trigger and define the Sheet content
    <Sheet open={isModelSheetOpen} onOpenChange={setIsModelSheetOpen}>
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

      {/* Sheet Content for Model Selection */}
      <SheetContent
        side="right"
        className="w-[250px] sm:w-[400px] p-0 gap-0 rounded-lg flex flex-col" // Added flex flex-col
      >
        <SheetHeader className="border-b p-4">
          {" "}
          {/* Added padding */}
          <SheetTitle>Your Models</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {" "}
          {/* Ensure scroll */}
          <Accordion type="single" collapsible className="w-full">
            {modelProviders.map((provider) => (
              <AccordionItem
                key={provider.providerName}
                value={provider.providerName}
              >
                <AccordionTrigger>
                  <div className="flex items-center justify-start">
                    {provider.image && ( // Conditionally render image
                      <img
                        src={provider.image}
                        alt={provider.providerName}
                        className="h-6 w-6 mr-2 rounded-full object-contain" // Added object-contain
                      />
                    )}
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
    </Sheet>
  );
};

export default ModelSelectorSheet;
