export interface RequestConfig {
  headers: {
    set: (name: string, value: string) => void;
    [key: string]: any;
  };
  [key: string]: any;
}

export const client = {
  setConfig: (_config: { baseURL: string }) => {},
  interceptors: {
    request: {
      use: (_fn: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>) => {},
    },
  },
};
