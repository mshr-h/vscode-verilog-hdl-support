// SPDX-License-Identifier: MIT
import {
  PROJECT_DIAGNOSTIC_SOURCE,
  type CompileUnit,
  type ProjectDiagnostic,
  type ProjectSnapshot,
} from './ProjectTypes';

export function findCompileUnitByTarget(
  snapshot: ProjectSnapshot,
  targetId: string
): CompileUnit | undefined {
  if (targetId.length === 0) {
    return snapshot.compileUnits.length === 1 ? snapshot.compileUnits[0] : undefined;
  }
  return snapshot.compileUnits.find((compileUnit) => compileUnit.id === targetId)
    ?? snapshot.compileUnits.find((compileUnit) => compileUnit.name === targetId);
}

export function getActiveCompileUnit(snapshot: ProjectSnapshot): CompileUnit | undefined {
  return findCompileUnitByTarget(snapshot, snapshot.activeTargetId);
}

export function getAvailableCompileUnitLabels(snapshot: ProjectSnapshot): string[] {
  return snapshot.compileUnits.map((compileUnit) => `${compileUnit.name} (${compileUnit.id})`);
}

export function createActiveTargetDiagnostic(snapshot: ProjectSnapshot): ProjectDiagnostic | undefined {
  if (snapshot.activeTargetId.length === 0 || getActiveCompileUnit(snapshot)) {
    return undefined;
  }
  const available = getAvailableCompileUnitLabels(snapshot).join(', ') || '(none)';
  return {
    severity: 'warning',
    message: `Active project target "${snapshot.activeTargetId}" was not found. Available compile units: ${available}.`,
    source: PROJECT_DIAGNOSTIC_SOURCE,
    code: 'active-target-not-found',
  };
}
