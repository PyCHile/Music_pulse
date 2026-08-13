export interface OpenRouterModel { id: string; supported_parameters?: string[]; }

/**
 * Model resolution is intentionally server-side only.
 * The browser must never query OpenRouter or persist provider credentials.
 */
export class OpenRouterModelResolver {
  constructor(private readonly version='server-managed') { void this.version; }
  async resolve():Promise<string|null>{throw new Error('OpenRouter model resolution is available only through the secure URUX Worker backend.');}
  async fetchEligibleModels():Promise<OpenRouterModel[]>{return [];}
}
