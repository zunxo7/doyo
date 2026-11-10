const openCalls = new Set<string>();

export function enterRiskyCall(action: string, _detail?: string): string {
  openCalls.add(action);
  return action;
}

export function leaveRiskyCall(action: string): void {
  openCalls.delete(action);
}

export function takeAbandoned(): string[] {
  const abandoned = [...openCalls];
  openCalls.clear();
  return abandoned;
}
