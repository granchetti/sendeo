export interface RouteRequestQueue {
  send(message: string): Promise<void>;
}

