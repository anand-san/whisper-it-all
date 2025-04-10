export interface Model {
  id: string;
  name: string;
}

export interface ModelProvider {
  providerName: string;
  models: Model[];
  image?: string;
}
