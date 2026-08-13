import type { ASTNode } from './expression-parser.js';
import { safeRegexTest } from './regex-utils.js';

export interface WorkloadContext {
  cluster: string;
  namespace: string;
  deployment: string;
  pod: string;
  service: string;
  node: string;
  container_image: string;
  workload_name: string;
  k8s_labels: Record<string, string>;
  k8s_annotations: Record<string, string>;
}

function resolveField(ctx: WorkloadContext, node: ASTNode): string | undefined {
  if (node.type === 'field_access') {
    if (node.path.length === 0) {
      const key = node.object as keyof WorkloadContext;
      const val = ctx[key];
      if (typeof val === 'string') return val;
      return undefined;
    }

    if (node.object === 'k8s' && node.path.length >= 1) {
      const mapName = node.path[0];
      if (mapName === 'labels' && node.path.length === 2) {
        return ctx.k8s_labels[node.path[1]];
      }
      if (mapName === 'annotations' && node.path.length === 2) {
        return ctx.k8s_annotations[node.path[1]];
      }
    }

    const key = node.object as keyof WorkloadContext;
    const val = ctx[key];
    if (typeof val === 'string') return val;
    return undefined;
  }

  if (node.type === 'literal') {
    return String(node.value);
  }

  return undefined;
}

function resolveArray(node: ASTNode): string[] {
  if (node.type === 'array') {
    return node.elements.map((el) => {
      if (el.type === 'literal') return String(el.value);
      return '';
    });
  }
  return [];
}

export function evaluateAST(node: ASTNode, ctx: WorkloadContext): boolean {
  switch (node.type) {
    case 'comparison': {
      const leftVal = resolveField(ctx, node.left);
      const op = node.operator;

      if (op === 'in' || op === 'not_in') {
        const arr = resolveArray(node.right);
        if (leftVal === undefined) return op === 'not_in';
        const found = arr.includes(leftVal);
        return op === 'in' ? found : !found;
      }

      const rightVal = resolveField(ctx, node.right);

      switch (op) {
        case '==':
          return leftVal === rightVal;
        case '!=':
          return leftVal !== rightVal;
        case '=~':
          if (leftVal === undefined || rightVal === undefined) return false;
          return safeRegexTest(rightVal, leftVal);
        case '!~':
          if (leftVal === undefined || rightVal === undefined) return true;
          return !safeRegexTest(rightVal, leftVal);
        case 'contains':
          if (leftVal === undefined || rightVal === undefined) return false;
          return leftVal.includes(rightVal);
        case 'starts_with':
          if (leftVal === undefined || rightVal === undefined) return false;
          return leftVal.startsWith(rightVal);
        case 'ends_with':
          if (leftVal === undefined || rightVal === undefined) return false;
          return leftVal.endsWith(rightVal);
        default:
          return false;
      }
    }

    case 'logical': {
      const left = evaluateAST(node.left, ctx);
      if (node.operator === 'AND') return left && evaluateAST(node.right, ctx);
      if (node.operator === 'OR') return left || evaluateAST(node.right, ctx);
      return false;
    }

    case 'not':
      return !evaluateAST(node.operand, ctx);

    case 'function_call': {
      if (node.name === 'exists') {
        if (node.args.length === 0) return false;
        const val = resolveField(ctx, node.args[0]);
        return val !== undefined && val !== '';
      }
      return false;
    }

    case 'field_access': {
      const val = resolveField(ctx, node);
      return val !== undefined && val !== '';
    }

    case 'literal':
      return Boolean(node.value);

    default:
      return false;
  }
}
