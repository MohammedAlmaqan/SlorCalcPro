import type { AuditStep } from './types';

/**
 * Records each engineering calculation step so results can be audited and
 * verified by the designer (the "show your work" feature).
 */
export class AuditTrail {
  private readonly steps: AuditStep[] = [];

  add(step: Omit<AuditStep, 'id'> & { id?: string }): void {
    const id = step.id ?? `${step.formula}-${this.steps.length}`;
    this.steps.push({ ...step, id });
  }

  get all(): AuditStep[] {
    return this.steps;
  }
}
