export type TokenType =
  | 'STRING'
  | 'NUMBER'
  | 'IDENT'
  | 'OPERATOR'
  | 'LOGICAL'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'DOT'
  | 'COMMA'
  | 'NOT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export type ASTNode =
  | ComparisonNode
  | LogicalNode
  | FunctionCallNode
  | NotNode
  | FieldAccessNode
  | LiteralNode
  | ArrayNode;

export interface ComparisonNode {
  type: 'comparison';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface LogicalNode {
  type: 'logical';
  operator: 'AND' | 'OR';
  left: ASTNode;
  right: ASTNode;
}

export interface FunctionCallNode {
  type: 'function_call';
  name: string;
  args: ASTNode[];
}

export interface NotNode {
  type: 'not';
  operand: ASTNode;
}

export interface FieldAccessNode {
  type: 'field_access';
  object: string;
  path: string[];
}

export interface LiteralNode {
  type: 'literal';
  value: string | number | boolean;
}

export interface ArrayNode {
  type: 'array';
  elements: ASTNode[];
}

const MAX_EXPRESSION_LENGTH = 4096;

const OPERATORS = ['==', '!=', '=~', '!~', '>=', '<=', '>', '<'];
const KEYWORD_OPERATORS = ['contains', 'starts_with', 'ends_with', 'in', 'not_in'];
const LOGICAL_KEYWORDS = ['AND', 'OR'];

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

function isAlpha(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isAlphaNum(ch: string): boolean {
  return isAlpha(ch) || (ch >= '0' && ch <= '9');
}

export function tokenize(input: string): Token[] {
  if (input.length > MAX_EXPRESSION_LENGTH) {
    throw new Error(`Expression exceeds maximum length of ${MAX_EXPRESSION_LENGTH}`);
  }

  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    if (isWhitespace(input[i])) {
      i++;
      continue;
    }

    if (input[i] === '"' || input[i] === "'") {
      const quote = input[i];
      const start = i;
      i++;
      let str = '';
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) {
          i++;
          str += input[i];
        } else {
          str += input[i];
        }
        i++;
      }
      if (i >= input.length) throw new Error(`Unterminated string at position ${start}`);
      i++;
      tokens.push({ type: 'STRING', value: str, pos: start });
      continue;
    }

    if (input[i] >= '0' && input[i] <= '9') {
      const start = i;
      while (i < input.length && ((input[i] >= '0' && input[i] <= '9') || input[i] === '.')) i++;
      tokens.push({ type: 'NUMBER', value: input.slice(start, i), pos: start });
      continue;
    }

    if (input[i] === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i });
      i++;
      continue;
    }
    if (input[i] === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i });
      i++;
      continue;
    }
    if (input[i] === '[') {
      tokens.push({ type: 'LBRACKET', value: '[', pos: i });
      i++;
      continue;
    }
    if (input[i] === ']') {
      tokens.push({ type: 'RBRACKET', value: ']', pos: i });
      i++;
      continue;
    }
    if (input[i] === '.') {
      tokens.push({ type: 'DOT', value: '.', pos: i });
      i++;
      continue;
    }
    if (input[i] === ',') {
      tokens.push({ type: 'COMMA', value: ',', pos: i });
      i++;
      continue;
    }

    if (input[i] === '!' && i + 1 < input.length) {
      if (input[i + 1] === '=') {
        tokens.push({ type: 'OPERATOR', value: '!=', pos: i });
        i += 2;
        continue;
      }
      if (input[i + 1] === '~') {
        tokens.push({ type: 'OPERATOR', value: '!~', pos: i });
        i += 2;
        continue;
      }
      tokens.push({ type: 'NOT', value: '!', pos: i });
      i++;
      continue;
    }

    const twoChar = input.slice(i, i + 2);
    if (OPERATORS.includes(twoChar)) {
      tokens.push({ type: 'OPERATOR', value: twoChar, pos: i });
      i += 2;
      continue;
    }

    const oneChar = input[i];
    if (oneChar === '>' || oneChar === '<') {
      tokens.push({ type: 'OPERATOR', value: oneChar, pos: i });
      i++;
      continue;
    }

    if (isAlpha(input[i])) {
      const start = i;
      while (i < input.length && (isAlphaNum(input[i]) || input[i] === '.')) i++;
      const word = input.slice(start, i);

      if (LOGICAL_KEYWORDS.includes(word.toUpperCase())) {
        tokens.push({ type: 'LOGICAL', value: word.toUpperCase(), pos: start });
      } else if (KEYWORD_OPERATORS.includes(word)) {
        tokens.push({ type: 'OPERATOR', value: word, pos: start });
      } else if (word === 'true' || word === 'false') {
        tokens.push({ type: 'STRING', value: word, pos: start });
      } else {
        tokens.push({ type: 'IDENT', value: word, pos: start });
      }
      continue;
    }

    throw new Error(`Unexpected character '${input[i]}' at position ${i}`);
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    this.pos++;
    return tok;
  }

  private expect(type: TokenType, value?: string): Token {
    const tok = this.peek();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new Error(
        `Expected ${type}${value ? ` '${value}'` : ''} but got ${tok.type} '${tok.value}' at position ${tok.pos}`,
      );
    }
    return this.advance();
  }

  parse(): ASTNode {
    const node = this.parseOr();
    if (this.peek().type !== 'EOF') {
      throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().pos}`);
    }
    return node;
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.peek().type === 'LOGICAL' && this.peek().value === 'OR') {
      this.advance();
      const right = this.parseAnd();
      left = { type: 'logical', operator: 'OR', left, right };
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseComparison();
    while (this.peek().type === 'LOGICAL' && this.peek().value === 'AND') {
      this.advance();
      const right = this.parseComparison();
      left = { type: 'logical', operator: 'AND', left, right };
    }
    return left;
  }

  private parseComparison(): ASTNode {
    if (this.peek().type === 'NOT') {
      this.advance();
      const operand = this.parseComparison();
      return { type: 'not', operand };
    }

    if (this.peek().type === 'LPAREN') {
      this.advance();
      const node = this.parseOr();
      this.expect('RPAREN');
      if (this.peek().type === 'OPERATOR') {
        const op = this.advance();
        const right = this.parsePrimary();
        return { type: 'comparison', operator: op.value, left: node, right };
      }
      return node;
    }

    const left = this.parsePrimary();

    if (this.peek().type === 'OPERATOR') {
      const op = this.advance();
      const right = this.parsePrimary();
      return { type: 'comparison', operator: op.value, left, right };
    }

    return left;
  }

  private parsePrimary(): ASTNode {
    const tok = this.peek();

    if (tok.type === 'STRING') {
      this.advance();
      return { type: 'literal', value: tok.value };
    }

    if (tok.type === 'NUMBER') {
      this.advance();
      return { type: 'literal', value: parseFloat(tok.value) };
    }

    if (tok.type === 'LBRACKET') {
      return this.parseArray();
    }

    if (tok.type === 'LPAREN') {
      this.advance();
      const node = this.parseOr();
      this.expect('RPAREN');
      return node;
    }

    if (tok.type === 'IDENT') {
      const name = this.advance().value;

      if (this.peek().type === 'LPAREN') {
        this.advance();
        const args: ASTNode[] = [];
        if (this.peek().type !== 'RPAREN') {
          args.push(this.parseOr());
          while (this.peek().type === 'COMMA') {
            this.advance();
            args.push(this.parseOr());
          }
        }
        this.expect('RPAREN');
        return { type: 'function_call', name, args };
      }

      if (this.peek().type === 'DOT' || this.peek().type === 'LBRACKET') {
        const path: string[] = [];
        while (
          this.peek().type === 'DOT' ||
          this.peek().type === 'LBRACKET'
        ) {
          if (this.peek().type === 'DOT') {
            this.advance();
            const prop = this.expect('IDENT');
            path.push(prop.value);

            if (this.peek().type === 'LPAREN') {
              this.advance();
              const args: ASTNode[] = [];
              if (this.peek().type !== 'RPAREN') {
                args.push(this.parseOr());
                while (this.peek().type === 'COMMA') {
                  this.advance();
                  args.push(this.parseOr());
                }
              }
              this.expect('RPAREN');
              const fieldNode: FieldAccessNode = { type: 'field_access', object: name, path };
              return { type: 'function_call', name: path[path.length - 1], args: [fieldNode, ...args] };
            }
          } else {
            this.advance();
            const key = this.expect('STRING');
            path.push(key.value);
            this.expect('RBRACKET');
          }
        }
        return { type: 'field_access', object: name, path };
      }

      return { type: 'field_access', object: name, path: [] };
    }

    throw new Error(`Unexpected token '${tok.value}' at position ${tok.pos}`);
  }

  private parseArray(): ArrayNode {
    this.expect('LBRACKET');
    const elements: ASTNode[] = [];
    if (this.peek().type !== 'RBRACKET') {
      elements.push(this.parsePrimary());
      while (this.peek().type === 'COMMA') {
        this.advance();
        elements.push(this.parsePrimary());
      }
    }
    this.expect('RBRACKET');
    return { type: 'array', elements };
  }
}

export function parseExpression(input: string): ASTNode {
  const tokens = tokenize(input.trim());
  const parser = new Parser(tokens);
  return parser.parse();
}
