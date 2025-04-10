import React, { createContext, useState, useContext, ReactNode } from "react";
import { ModelProvider } from "../utils/types";
import { availableModelsRegistry, DEFAULT_MODEL_ID } from "../utils/constants";

interface ModelSelectionContextType {
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  modelProviders: ModelProvider[];
  isModelSheetOpen: boolean;
  setIsModelSheetOpen: (isOpen: boolean) => void;
  getModelNameById: (id: string) => string | undefined;
}

const ModelSelectionContext = createContext<
  ModelSelectionContextType | undefined
>(undefined);

interface ModelSelectionProviderProps {
  children: ReactNode;
}

export const ModelSelectionProvider: React.FC<ModelSelectionProviderProps> = ({
  children,
}) => {
  const [selectedModelId, setSelectedModelId] =
    useState<string>(DEFAULT_MODEL_ID);
  const [isModelSheetOpen, setIsModelSheetOpen] = useState<boolean>(false);

  const getModelNameById = (id: string): string | undefined => {
    for (const provider of availableModelsRegistry) {
      const model = provider.models.find((m) => m.id === id);
      if (model) {
        return model.name;
      }
    }
    return undefined;
  };

  const value = {
    selectedModelId,
    setSelectedModelId,
    modelProviders: availableModelsRegistry,
    isModelSheetOpen,
    setIsModelSheetOpen,
    getModelNameById,
  };

  return (
    <ModelSelectionContext.Provider value={value}>
      {children}
    </ModelSelectionContext.Provider>
  );
};

export const useModelSelection = (): ModelSelectionContextType => {
  const context = useContext(ModelSelectionContext);
  if (context === undefined) {
    throw new Error(
      "useModelSelection must be used within a ModelSelectionProvider"
    );
  }
  return context;
};
