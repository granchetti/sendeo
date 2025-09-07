let currentTraceId: string | undefined;

export function setTraceId(id: string) {
  currentTraceId = id;
}

export function getTraceId(): string | undefined {
  return currentTraceId;
}

export function clearTraceId() {
  currentTraceId = undefined;
}
