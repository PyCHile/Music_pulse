export interface OpenRouterModel {
  id: string;
  supported_parameters?: string[];
}

const MODELS_URL = 'https://openrouter.ai/api/v1/models';
const STORAGE_KEY = 'urux_model_id';

export class OpenRouterModelResolver {
  constructor(private readonly version = '1.0.0') {}

  async resolve(): Promise<string | null> {
    const models = await this.fetchEligibleModels();
    if (!models.length) return null;

    const persisted = localStorage.getItem(STORAGE_KEY);
    if (persisted && models.some((model) => model.id === persisted)) return persisted;

    const serialized = JSON.stringify(models);
    const data = new TextEncoder().encode(`URUX${this.version}${serialized}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const tail = hex.slice(-8);
    const index = Number.parseInt(tail, 16) % models.length;
    const selected = models[index].id;
    localStorage.setItem(STORAGE_KEY, selected);
    return selected;
  }

  async fetchEligibleModels(): Promise<OpenRouterModel[]> {
    const response = await fetch(MODELS_URL, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`OpenRouter models request failed: ${response.status}`);
    const body = (await response.json()) as { data?: OpenRouterModel[] };
    return (body.data ?? [])
      .filter((model) => model.id.endsWith(':free'))
      .filter((model) => model.supported_parameters?.includes('response_format'))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
}
