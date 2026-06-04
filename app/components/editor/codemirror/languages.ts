import { LanguageDescription, StreamLanguage, LanguageSupport } from '@codemirror/language';
import { Language } from '@codemirror/language';

/*
 * =============================================================================
 *  StreamLanguage parsers for languages without official CodeMirror packages
 * =============================================================================
 *
 *  Each parser is intentionally minimal: comments, strings, numbers, and
 *  the most common keywords. They are NOT meant to be full parsers — just
 *  enough to give readable highlighting for unknown languages.
 *
 *  Pattern: keyword lists + line/block comment styles + bracket pairs.
 *  Add a new parser by passing a config to `defineSimpleParser` below.
 */

type SimpleParserConfig = {
  keywords?: string[];
  types?: string[];
  constants?: string[];
  lineComment?: string;
  blockComment?: [string, string];
  brackets?: string[];
  hashComment?: boolean;
  semicolonComment?: boolean;
  semicolon?: boolean;
  indentUnit?: number;
};

const DEFAULT_BRACKETS = ['(', ')', '[', ']', '{', '}', '<', '>'];

const defineSimpleParser = (config: SimpleParserConfig) => {
  const {
    keywords = [],
    types = [],
    constants = [],
    lineComment,
    blockComment,
    brackets = DEFAULT_BRACKETS,
    hashComment = false,
    semicolonComment = false,
    semicolon = false,
    indentUnit = 2,
  } = config;

  const keywordSet = new Set(keywords);
  const typeSet = new Set(types);
  const constantSet = new Set(constants);

  type SimpleState = {
    inString: false | '"' | "'" | '`';
    inBlockComment: boolean;
  };

  return StreamLanguage.define<SimpleState>({
    startState: () => ({ inString: false, inBlockComment: false }),

    token(stream, state) {
      if (state.inBlockComment) {
        while (!stream.eol()) {
          const ch = stream.next();

          if (blockComment && ch === '*' && stream.peek() === '/') {
            stream.next();
            state.inBlockComment = false;

            return 'comment';
          }
        }

        return 'comment';
      }

      if (state.inString) {
        while (!stream.eol()) {
          const ch = stream.next();

          if (ch === '\\') {
            stream.next();
            continue;
          }

          if (ch === state.inString) {
            state.inString = false;
            return 'string';
          }
        }

        return 'string';
      }

      if (stream.eatSpace()) {
        return null;
      }

      if (lineComment && stream.match(lineComment)) {
        stream.skipToEnd();
        return 'lineComment';
      }

      if (hashComment && stream.match(/^#.*/)) {
        stream.skipToEnd();
        return 'lineComment';
      }

      if (semicolonComment && stream.match(/^;.*/)) {
        stream.skipToEnd();
        return 'lineComment';
      }

      if (blockComment && stream.match(blockComment[0])) {
        if (stream.match(`${blockComment[0]}${blockComment[1]}`)) {
          return 'comment';
        }
        state.inBlockComment = true;

        return 'comment';
      }

      const ch = stream.next();

      if (!ch) {
        return null;
      }

      if (ch === '"' || ch === "'" || ch === '`') {
        state.inString = ch;
        return 'string';
      }

      if (/\d/.test(ch)) {
        stream.eatWhile(/[\d\.xXbBoO_a-fA-F]/);
        return 'number';
      }

      if (/[a-zA-Z_]/.test(ch)) {
        stream.eatWhile(/[\w\-]/);
        const word = stream.current();

        if (keywordSet.has(word)) {
          return 'keyword';
        }

        if (typeSet.has(word)) {
          return 'typeName';
        }

        if (constantSet.has(word)) {
          return 'constant';
        }

        if (word === 'true' || word === 'false' || word === 'null' || word === 'nil' || word === 'None') {
          return 'atom';
        }

        return 'variable';
      }

      if (brackets.includes(ch)) {
        return 'bracket';
      }

      if (semicolon && ch === ';') {
        stream.skipToEnd();
        return 'lineComment';
      }

      return null;
    },

    languageData: {
      commentTokens: {
        line: lineComment || (hashComment ? '#' : semicolonComment ? ';' : undefined),
        block: blockComment ? { open: blockComment[0], close: blockComment[1] } : undefined,
      },
      closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`'] },
      indentOnInput: /^\s*(?:end|else|elif|elseif|fi|done|esac|\}|\)])$/,
      autocomplete: undefined as never,
    },

    indent(_state, _textAfter, ctx) {
      if (ctx.unit !== indentUnit) {
        return ctx.unit;
      }

      return -1;
    },
  });
};

/*
 *  Concrete language parsers
 */

const shellParser = defineSimpleParser({
  keywords: [
    'if',
    'then',
    'else',
    'elif',
    'fi',
    'case',
    'esac',
    'for',
    'while',
    'until',
    'do',
    'done',
    'in',
    'function',
    'select',
    'time',
    'coproc',
    'return',
    'exit',
    'break',
    'continue',
    'export',
    'local',
    'readonly',
    'declare',
    'set',
    'unset',
    'shift',
    'source',
    'alias',
    'unalias',
  ],
  constants: ['true', 'false'],
  lineComment: '#',
  brackets: ['(', ')', '[', ']', '{', '}'],
  hashComment: true,
});

const dockerfileParser = defineSimpleParser({
  keywords: [
    'FROM',
    'RUN',
    'CMD',
    'LABEL',
    'MAINTAINER',
    'EXPOSE',
    'ENV',
    'ADD',
    'COPY',
    'ENTRYPOINT',
    'VOLUME',
    'USER',
    'WORKDIR',
    'ARG',
    'ONBUILD',
    'STOPSIGNAL',
    'HEALTHCHECK',
    'SHELL',
    'AS',
  ],
  constants: ['true', 'false'],
  lineComment: '#',
});

const yamlParser = defineSimpleParser({
  constants: ['true', 'false', 'null', '~'],
  lineComment: '#',
  brackets: ['[', ']', '{', '}'],
  hashComment: true,
});

const tomlParser = defineSimpleParser({
  constants: ['true', 'false'],
  lineComment: '#',
  hashComment: true,
});

const iniParser = defineSimpleParser({
  constants: ['true', 'false', 'null', 'yes', 'no', 'on', 'off'],
  lineComment: ';',
  semicolonComment: true,
  brackets: ['[', ']'],
});

const propertiesParser = defineSimpleParser({
  lineComment: '#',
  hashComment: true,
});

const sqlParser = defineSimpleParser({
  keywords: [
    'SELECT',
    'FROM',
    'WHERE',
    'INSERT',
    'INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE',
    'CREATE',
    'TABLE',
    'INDEX',
    'VIEW',
    'DATABASE',
    'SCHEMA',
    'DROP',
    'ALTER',
    'TRUNCATE',
    'JOIN',
    'INNER',
    'LEFT',
    'RIGHT',
    'OUTER',
    'FULL',
    'CROSS',
    'ON',
    'USING',
    'GROUP',
    'BY',
    'ORDER',
    'HAVING',
    'LIMIT',
    'OFFSET',
    'UNION',
    'ALL',
    'DISTINCT',
    'AS',
    'AND',
    'OR',
    'NOT',
    'NULL',
    'IS',
    'IN',
    'EXISTS',
    'BETWEEN',
    'LIKE',
    'PRIMARY',
    'KEY',
    'FOREIGN',
    'REFERENCES',
    'UNIQUE',
    'CHECK',
    'DEFAULT',
    'CONSTRAINT',
    'BEGIN',
    'COMMIT',
    'ROLLBACK',
    'TRANSACTION',
    'GRANT',
    'REVOKE',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'INT',
    'INTEGER',
    'BIGINT',
    'SMALLINT',
    'TINYINT',
    'DECIMAL',
    'NUMERIC',
    'FLOAT',
    'REAL',
    'DOUBLE',
    'CHAR',
    'VARCHAR',
    'TEXT',
    'DATE',
    'TIME',
    'DATETIME',
    'TIMESTAMP',
    'BOOLEAN',
    'BLOB',
    'CLOB',
    'JSON',
    'JSONB',
    'UUID',
    'SERIAL',
    'BIGSERIAL',
  ],
  constants: ['TRUE', 'FALSE', 'NULL'],
  lineComment: '--',
  blockComment: ['/*', '*/'],
  brackets: ['(', ')', '[', ']'],
});

const goParser = defineSimpleParser({
  keywords: [
    'break',
    'default',
    'func',
    'interface',
    'select',
    'case',
    'defer',
    'go',
    'map',
    'struct',
    'chan',
    'else',
    'goto',
    'package',
    'switch',
    'const',
    'fallthrough',
    'if',
    'range',
    'type',
    'continue',
    'for',
    'import',
    'return',
    'var',
  ],
  types: [
    'bool',
    'byte',
    'complex64',
    'complex128',
    'error',
    'float32',
    'float64',
    'int',
    'int8',
    'int16',
    'int32',
    'int64',
    'rune',
    'string',
    'uint',
    'uint8',
    'uint16',
    'uint32',
    'uint64',
    'uintptr',
    'any',
    'comparable',
  ],
  constants: ['true', 'false', 'nil', 'iota'],
  lineComment: '//',
  blockComment: ['/*', '*/'],
  semicolon: true,
});

const rustParser = defineSimpleParser({
  keywords: [
    'as',
    'async',
    'await',
    'break',
    'const',
    'continue',
    'crate',
    'dyn',
    'else',
    'enum',
    'extern',
    'false',
    'fn',
    'for',
    'if',
    'impl',
    'in',
    'let',
    'loop',
    'match',
    'mod',
    'move',
    'mut',
    'pub',
    'ref',
    'return',
    'self',
    'Self',
    'static',
    'struct',
    'super',
    'trait',
    'true',
    'type',
    'unsafe',
    'use',
    'where',
    'while',
  ],
  types: [
    'i8',
    'i16',
    'i32',
    'i64',
    'i128',
    'isize',
    'u8',
    'u16',
    'u32',
    'u64',
    'u128',
    'usize',
    'f32',
    'f64',
    'bool',
    'char',
    'str',
    'String',
    'Vec',
    'Option',
    'Result',
    'Box',
    'Rc',
    'Arc',
    'Cell',
    'RefCell',
  ],
  constants: ['true', 'false', 'None', 'Some'],
  lineComment: '//',
  blockComment: ['/*', '*/'],
});

const javaParser = defineSimpleParser({
  keywords: [
    'abstract',
    'assert',
    'boolean',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'class',
    'const',
    'continue',
    'default',
    'do',
    'double',
    'else',
    'enum',
    'extends',
    'final',
    'finally',
    'float',
    'for',
    'goto',
    'if',
    'implements',
    'import',
    'instanceof',
    'int',
    'interface',
    'long',
    'native',
    'new',
    'package',
    'private',
    'protected',
    'public',
    'record',
    'return',
    'sealed',
    'short',
    'static',
    'strictfp',
    'super',
    'switch',
    'synchronized',
    'this',
    'throw',
    'throws',
    'transient',
    'try',
    'void',
    'volatile',
    'while',
    'yield',
    'var',
    'non-sealed',
    'permits',
  ],
  types: [
    'String',
    'Integer',
    'Long',
    'Double',
    'Float',
    'Boolean',
    'Character',
    'Byte',
    'Short',
    'Object',
    'List',
    'Map',
    'Set',
    'Optional',
    'Stream',
    'Collection',
    'Iterable',
  ],
  constants: ['true', 'false', 'null'],
  lineComment: '//',
  blockComment: ['/*', '*/'],
});

const kotlinParser = defineSimpleParser({
  keywords: [
    'as',
    'break',
    'class',
    'continue',
    'do',
    'else',
    'false',
    'for',
    'fun',
    'if',
    'in',
    'interface',
    'is',
    'null',
    'object',
    'package',
    'return',
    'super',
    'this',
    'throw',
    'true',
    'try',
    'typealias',
    'typeof',
    'val',
    'var',
    'when',
    'while',
    'by',
    'catch',
    'constructor',
    'delegate',
    'dynamic',
    'field',
    'file',
    'finally',
    'get',
    'import',
    'init',
    'param',
    'property',
    'receiver',
    'set',
    'setparam',
    'value',
    'where',
    'abstract',
    'actual',
    'annotation',
    'companion',
    'const',
    'crossinline',
    'data',
    'enum',
    'expect',
    'external',
    'final',
    'infix',
    'inline',
    'inner',
    'internal',
    'lateinit',
    'noinline',
    'open',
    'operator',
    'out',
    'override',
    'private',
    'protected',
    'public',
    'reified',
    'sealed',
    'suspend',
    'tailrec',
    'vararg',
  ],
  types: [
    'Int',
    'Long',
    'Short',
    'Byte',
    'Float',
    'Double',
    'Boolean',
    'Char',
    'String',
    'Any',
    'Unit',
    'Nothing',
    'Array',
    'List',
    'MutableList',
    'Map',
    'MutableMap',
    'Set',
    'MutableSet',
  ],
  lineComment: '//',
  blockComment: ['/*', '*/'],
});

const swiftParser = defineSimpleParser({
  keywords: [
    'associatedtype',
    'class',
    'deinit',
    'enum',
    'extension',
    'fileprivate',
    'func',
    'import',
    'init',
    'inout',
    'internal',
    'let',
    'open',
    'operator',
    'private',
    'protocol',
    'public',
    'rethrows',
    'static',
    'struct',
    'subscript',
    'typealias',
    'var',
    'break',
    'case',
    'continue',
    'default',
    'defer',
    'do',
    'else',
    'fallthrough',
    'for',
    'guard',
    'if',
    'in',
    'repeat',
    'return',
    'switch',
    'where',
    'while',
    'as',
    'Any',
    'catch',
    'false',
    'is',
    'nil',
    'super',
    'self',
    'Self',
    'throw',
    'throws',
    'true',
    'try',
    '#available',
    '#colorLiteral',
    '#column',
    '#else',
    '#elseif',
    '#endif',
    '#error',
    '#file',
    '#filePath',
    '#function',
    '#if',
    '#imageLiteral',
    '#line',
    '#selector',
    '#sourceLocation',
    '#warning',
  ],
  types: [
    'Int',
    'UInt',
    'Double',
    'Float',
    'String',
    'Character',
    'Bool',
    'Array',
    'Dictionary',
    'Set',
    'Optional',
    'AnyObject',
    'AnyClass',
    'Data',
    'Date',
    'URL',
    'UUID',
  ],
  lineComment: '//',
  blockComment: ['/*', '*/'],
});

const csParser = defineSimpleParser({
  keywords: [
    'abstract',
    'as',
    'base',
    'bool',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'checked',
    'class',
    'const',
    'continue',
    'decimal',
    'default',
    'delegate',
    'do',
    'double',
    'else',
    'enum',
    'event',
    'explicit',
    'extern',
    'false',
    'finally',
    'fixed',
    'float',
    'for',
    'foreach',
    'goto',
    'if',
    'implicit',
    'in',
    'int',
    'interface',
    'internal',
    'is',
    'lock',
    'long',
    'namespace',
    'new',
    'null',
    'object',
    'operator',
    'out',
    'override',
    'params',
    'private',
    'protected',
    'public',
    'readonly',
    'ref',
    'return',
    'sbyte',
    'sealed',
    'short',
    'sizeof',
    'stackalloc',
    'static',
    'string',
    'struct',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'uint',
    'ulong',
    'unchecked',
    'unsafe',
    'ushort',
    'using',
    'virtual',
    'void',
    'volatile',
    'while',
    'async',
    'await',
    'var',
    'yield',
    'record',
    'init',
    'with',
    'nameof',
    'global',
  ],
  lineComment: '//',
  blockComment: ['/*', '*/'],
});

const rubyParser = defineSimpleParser({
  keywords: [
    'BEGIN',
    'END',
    'alias',
    'and',
    'begin',
    'break',
    'case',
    'class',
    'def',
    'defined?',
    'do',
    'else',
    'elsif',
    'end',
    'ensure',
    'false',
    'for',
    'if',
    'in',
    'module',
    'next',
    'nil',
    'not',
    'or',
    'redo',
    'rescue',
    'retry',
    'return',
    'self',
    'super',
    'then',
    'true',
    'undef',
    'unless',
    'until',
    'when',
    'while',
    'yield',
    '__FILE__',
    '__LINE__',
    '__dir__',
    '__method__',
  ],
  constants: ['true', 'false', 'nil', 'self'],
  lineComment: '#',
  hashComment: true,
});

const phpParser = defineSimpleParser({
  keywords: [
    'abstract',
    'and',
    'array',
    'as',
    'break',
    'callable',
    'case',
    'catch',
    'class',
    'clone',
    'const',
    'continue',
    'declare',
    'default',
    'die',
    'do',
    'echo',
    'else',
    'elseif',
    'empty',
    'enddeclare',
    'endfor',
    'endforeach',
    'endif',
    'endswitch',
    'endwhile',
    'eval',
    'exit',
    'extends',
    'false',
    'final',
    'finally',
    'fn',
    'for',
    'foreach',
    'function',
    'global',
    'goto',
    'if',
    'implements',
    'include',
    'include_once',
    'instanceof',
    'insteadof',
    'interface',
    'isset',
    'list',
    'match',
    'namespace',
    'new',
    'null',
    'or',
    'print',
    'private',
    'protected',
    'public',
    'readonly',
    'require',
    'require_once',
    'return',
    'self',
    'static',
    'switch',
    'throw',
    'trait',
    'true',
    'try',
    'unset',
    'use',
    'var',
    'while',
    'xor',
    'yield',
    'from',
    'enum',
  ],
  types: [
    'int',
    'float',
    'string',
    'bool',
    'array',
    'object',
    'mixed',
    'void',
    'never',
    'iterable',
    'self',
    'static',
    'parent',
  ],
  lineComment: '//',
  blockComment: ['/*', '*/'],
  hashComment: true,
});

const luaParser = defineSimpleParser({
  keywords: [
    'and',
    'break',
    'do',
    'else',
    'elseif',
    'end',
    'false',
    'for',
    'function',
    'goto',
    'if',
    'in',
    'local',
    'nil',
    'not',
    'or',
    'repeat',
    'return',
    'then',
    'true',
    'until',
    'while',
  ],
  lineComment: '--',
  blockComment: ['--[[', ']]'],
});

const perlParser = defineSimpleParser({
  keywords: [
    'if',
    'elsif',
    'else',
    'unless',
    'while',
    'until',
    'for',
    'foreach',
    'do',
    'last',
    'next',
    'redo',
    'return',
    'sub',
    'my',
    'our',
    'local',
    'state',
    'use',
    'no',
    'require',
    'package',
    'BEGIN',
    'END',
    'CHECK',
    'INIT',
    'bless',
    'ref',
    'wantarray',
    'caller',
    'die',
    'warn',
    'exit',
    'print',
    'say',
    'chomp',
    'chop',
    'split',
    'join',
    'map',
    'grep',
    'sort',
    'reverse',
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'keys',
    'values',
    'each',
    'exists',
    'delete',
    'defined',
    'undef',
    'true',
    'false',
  ],
  lineComment: '#',
  hashComment: true,
});

const rParser = defineSimpleParser({
  keywords: [
    'if',
    'else',
    'for',
    'while',
    'repeat',
    'function',
    'in',
    'next',
    'break',
    'TRUE',
    'FALSE',
    'NULL',
    'Inf',
    'NaN',
    'NA',
    'NA_integer_',
    'NA_real_',
    'NA_complex_',
    'NA_character_',
    '...',
    '..1',
    '..2',
    '..3',
    '..4',
    '..5',
    '..6',
    '..7',
    '..8',
    '..9',
  ],
  lineComment: '#',
  hashComment: true,
});

const haskellParser = defineSimpleParser({
  keywords: [
    'case',
    'class',
    'data',
    'default',
    'deriving',
    'do',
    'else',
    'foreign',
    'if',
    'import',
    'in',
    'infix',
    'infixl',
    'infixr',
    'instance',
    'let',
    'module',
    'newtype',
    'of',
    'then',
    'type',
    'where',
    '_',
    '..',
    ':',
    '::',
    '->',
    '<-',
    '=>',
    '|',
    '=',
    '\\',
    '@',
    '~',
  ],
  types: [
    'Int',
    'Integer',
    'Float',
    'Double',
    'Bool',
    'Char',
    'String',
    'Maybe',
    'Either',
    'IO',
    'Eq',
    'Ord',
    'Show',
    'Read',
    'Num',
    'Functor',
    'Applicative',
    'Monad',
  ],
  lineComment: '--',
  blockComment: ['{-', '-}'],
});

const elixirParser = defineSimpleParser({
  keywords: [
    'def',
    'defp',
    'defmodule',
    'defmacro',
    'defmacrop',
    'defstruct',
    'defoverridable',
    'defcallback',
    'defguard',
    'defguardp',
    'do',
    'end',
    'fn',
    '->',
    '|>',
    'when',
    'if',
    'else',
    'unless',
    'case',
    'cond',
    'with',
    'for',
    'while',
    'raise',
    'throw',
    'try',
    'catch',
    'rescue',
    'after',
    'import',
    'alias',
    'require',
    'use',
    'quote',
    'unquote',
    'super',
    '__MODULE__',
    '__DIR__',
    '__ENV__',
    '__CALLER__',
    '__STACKTRACE__',
    'true',
    'false',
    'nil',
    'and',
    'or',
    'not',
    'in',
    'match?',
    'is_atom',
    'is_binary',
  ],
  types: [
    'atom',
    'binary',
    'bitstring',
    'boolean',
    'float',
    'function',
    'integer',
    'list',
    'map',
    'nil',
    'pid',
    'port',
    'reference',
    'tuple',
  ],
  lineComment: '#',
  hashComment: true,
});

const erlangParser = defineSimpleParser({
  keywords: [
    'after',
    'and',
    'andalso',
    'band',
    'begin',
    'bnot',
    'bor',
    'bsl',
    'bsr',
    'bxor',
    'case',
    'catch',
    'cond',
    'div',
    'end',
    'fun',
    'if',
    'let',
    'not',
    'of',
    'or',
    'orelse',
    'query',
    'receive',
    'rem',
    'try',
    'when',
    'xor',
    'true',
    'false',
    'undefined',
  ],
  lineComment: '%',
});

const scalaParser = defineSimpleParser({
  keywords: [
    'abstract',
    'case',
    'catch',
    'class',
    'def',
    'do',
    'else',
    'extends',
    'false',
    'final',
    'finally',
    'for',
    'forSome',
    'if',
    'implicit',
    'import',
    'lazy',
    'match',
    'new',
    'null',
    'object',
    'override',
    'package',
    'private',
    'protected',
    'return',
    'sealed',
    'super',
    'this',
    'throw',
    'trait',
    'try',
    'true',
    'type',
    'val',
    'var',
    'while',
    'with',
    'yield',
    'given',
    'then',
    'enum',
  ],
  types: [
    'Any',
    'AnyVal',
    'AnyRef',
    'Boolean',
    'Byte',
    'Char',
    'Double',
    'Float',
    'Int',
    'Long',
    'Short',
    'String',
    'Unit',
    'Nothing',
    'List',
    'Map',
    'Set',
    'Option',
    'Some',
    'None',
    'Either',
    'Left',
    'Right',
    'Future',
    'Seq',
  ],
  lineComment: '//',
  blockComment: ['/*', '*/'],
});

const csharpParser = csParser;

const vimParser = defineSimpleParser({
  keywords: [
    'if',
    'else',
    'elseif',
    'endif',
    'for',
    'endfor',
    'while',
    'endwhile',
    'function',
    'endfunction',
    'try',
    'catch',
    'finally',
    'endtry',
    'augroup',
    'endaugroup',
    'autocmd',
    'command',
    'noremap',
    'nnoremap',
    'vnoremap',
    'inoremap',
    'tnoremap',
    'map',
    'nmap',
    'vmap',
    'imap',
    'tmap',
    'unmap',
    'nunmap',
    'vunmap',
    'iunmap',
    'let',
    'call',
    'execute',
    'echo',
    'echom',
    'echomsg',
    'echohl',
    'echon',
    'set',
    'setlocal',
    'setglobal',
    'let',
    'unlet',
    'lockvar',
    'unlockvar',
    'append',
    'normal',
    'silent',
    'verbose',
    'profile',
  ],
  lineComment: '"',
});

const diffParser = defineSimpleParser({
  keywords: [
    'diff',
    'index',
    '---',
    '+++',
    '@@',
    'new file mode',
    'deleted file mode',
    'old mode',
    'new mode',
    'similarity index',
    'dissimilarity index',
    'rename from',
    'rename to',
    'copy from',
    'copy to',
    'Binary files',
  ],
});

const protobufParser = defineSimpleParser({
  keywords: [
    'syntax',
    'import',
    'package',
    'option',
    'message',
    'enum',
    'service',
    'rpc',
    'returns',
    'stream',
    'oneof',
    'map',
    'reserved',
    'extensions',
    'extend',
    'group',
    'public',
    'weak',
    'true',
    'false',
    'required',
    'optional',
    'repeated',
  ],
  types: [
    'double',
    'float',
    'int64',
    'uint64',
    'int32',
    'fixed64',
    'fixed32',
    'bool',
    'string',
    'group',
    'bytes',
    'uint32',
    'sfixed32',
    'sfixed64',
    'sint32',
    'sint64',
  ],
  lineComment: '//',
});

const graphqlParser = defineSimpleParser({
  keywords: [
    'query',
    'mutation',
    'subscription',
    'fragment',
    'on',
    'type',
    'interface',
    'union',
    'enum',
    'input',
    'scalar',
    'schema',
    'extend',
    'implements',
    'directive',
    'true',
    'false',
    'null',
    'repeatable',
  ],
  types: ['String', 'Int', 'Float', 'Boolean', 'ID'],
  lineComment: '#',
  hashComment: true,
});

const apacheParser = defineSimpleParser({
  keywords: [
    'RewriteEngine',
    'RewriteRule',
    'RewriteCond',
    'RewriteBase',
    'RewriteLog',
    'VirtualHost',
    'ServerName',
    'ServerAlias',
    'DocumentRoot',
    'Directory',
    'Files',
    'Location',
    'IfModule',
    'LoadModule',
    'AddHandler',
    'SetHandler',
    'Action',
    'ErrorDocument',
    'LogLevel',
    'CustomLog',
    'TransferLog',
    'Header',
    'ProxyPass',
    'ProxyPassReverse',
    'SSLEngine',
    'SSLCertificateFile',
    'SSLCertificateKeyFile',
  ],
  lineComment: '#',
  hashComment: true,
});

const nginxParser = defineSimpleParser({
  keywords: [
    'http',
    'server',
    'location',
    'listen',
    'server_name',
    'root',
    'index',
    'try_files',
    'proxy_pass',
    'proxy_set_header',
    'proxy_redirect',
    'fastcgi_pass',
    'fastcgi_param',
    'upstream',
    'location',
    'if',
    'return',
    'rewrite',
    'set',
    'include',
    'gzip',
    'gzip_types',
    'gzip_comp_level',
    'gzip_min_length',
    'expires',
    'add_header',
    'access_log',
    'error_log',
    'worker_processes',
    'worker_connections',
    'events',
    'http',
    'stream',
    'mail',
    'server',
    'upstream',
    'location',
    'if',
    'geo',
    'map',
  ],
  lineComment: '#',
  hashComment: true,
});

const csvParser = defineSimpleParser({
  constants: ['true', 'false', 'null'],
});

const logParser = defineSimpleParser({
  keywords: ['INFO', 'WARN', 'WARNING', 'ERROR', 'DEBUG', 'TRACE', 'FATAL', 'PANIC'],
  types: ['INFO', 'WARN', 'WARNING', 'ERROR', 'DEBUG', 'TRACE', 'FATAL', 'PANIC'],
});

const plainTextParser = defineSimpleParser({});

/*
 * =============================================================================
 *  Language descriptions — real CodeMirror packages
 * =============================================================================
 */

const realPackageDescriptions: LanguageDescription[] = [
  LanguageDescription.of({
    name: 'Vue',
    extensions: ['vue'],
    async load() {
      return import('@codemirror/lang-vue').then((m) => m.vue());
    },
  }),
  LanguageDescription.of({
    name: 'TypeScript',
    extensions: ['ts', 'mts', 'cts'],
    async load() {
      return import('@codemirror/lang-javascript').then((m) => m.javascript({ typescript: true }));
    },
  }),
  LanguageDescription.of({
    name: 'TypeScript JSX',
    extensions: ['tsx'],
    async load() {
      return import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true, typescript: true }));
    },
  }),
  LanguageDescription.of({
    name: 'JavaScript',
    extensions: ['js', 'mjs', 'cjs', 'jsx'],
    async load() {
      return import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true }));
    },
  }),
  LanguageDescription.of({
    name: 'JavaScript (no JSX)',
    extensions: ['pac', 'jslib'],
    async load() {
      return import('@codemirror/lang-javascript').then((m) => m.javascript());
    },
  }),
  LanguageDescription.of({
    name: 'JSX',
    extensions: ['d.ts'],
    async load() {
      return import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true }));
    },
  }),
  LanguageDescription.of({
    name: 'HTML',
    extensions: ['html', 'htm', 'xhtml', 'shtml', 'asp', 'aspx', 'jsp', 'jspx', 'svg'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'CSS',
    extensions: ['css', 'pcss', 'postcss'],
    async load() {
      return import('@codemirror/lang-css').then((m) => m.css());
    },
  }),
  LanguageDescription.of({
    name: 'Sass (indented)',
    extensions: ['sass'],
    async load() {
      return import('@codemirror/lang-sass').then((m) => m.sass({ indented: true }));
    },
  }),
  LanguageDescription.of({
    name: 'SCSS',
    extensions: ['scss'],
    async load() {
      return import('@codemirror/lang-sass').then((m) => m.sass({ indented: false }));
    },
  }),
  LanguageDescription.of({
    name: 'Less',
    extensions: ['less'],
    async load() {
      return import('@codemirror/lang-css').then((m) => m.css());
    },
  }),
  LanguageDescription.of({
    name: 'JSON',
    extensions: ['json', 'jsonc', 'json5', 'geojson', 'webmanifest', 'map'],
    async load() {
      return import('@codemirror/lang-json').then((m) => m.json());
    },
  }),
  LanguageDescription.of({
    name: 'JSON-LD',
    extensions: ['jsonld'],
    async load() {
      return import('@codemirror/lang-json').then((m) => m.json());
    },
  }),
  LanguageDescription.of({
    name: 'Markdown',
    extensions: ['md', 'markdown', 'mdown', 'mkd', 'mkdn', 'mkdown', 'mdwn', 'mdtxt', 'mdtext'],
    async load() {
      return import('@codemirror/lang-markdown').then((m) => m.markdown());
    },
  }),
  LanguageDescription.of({
    name: 'MDX',
    extensions: ['mdx'],
    async load() {
      return import('@codemirror/lang-markdown').then((m) => m.markdown());
    },
  }),
  LanguageDescription.of({
    name: 'WebAssembly Text',
    extensions: ['wat'],
    async load() {
      return import('@codemirror/lang-wast').then((m) => m.wast());
    },
  }),
  LanguageDescription.of({
    name: 'WebAssembly Spec',
    extensions: ['wast'],
    async load() {
      return import('@codemirror/lang-wast').then((m) => m.wast());
    },
  }),
  LanguageDescription.of({
    name: 'Python',
    extensions: ['py', 'pyw', 'pyi', 'bzl', 'bazel'],
    async load() {
      return import('@codemirror/lang-python').then((m) => m.python());
    },
  }),
  LanguageDescription.of({
    name: 'C++',
    extensions: ['cpp', 'cxx', 'cc', 'c++', 'hpp', 'hxx', 'hh', 'h++', 'ipp', 'inl', 'tcc'],
    async load() {
      return import('@codemirror/lang-cpp').then((m) => m.cpp());
    },
  }),
  LanguageDescription.of({
    name: 'C/C++ Header',
    extensions: ['h'],
    async load() {
      return import('@codemirror/lang-cpp').then((m) => m.cpp());
    },
  }),
];

/*
 * =============================================================================
 *  Language descriptions — StreamLanguage parsers (synchronous)
 * =============================================================================
 */

const wrapSync = (parser: Language): LanguageSupport => new LanguageSupport(parser);

const streamDescriptions: LanguageDescription[] = [
  LanguageDescription.of({
    name: 'Shell',
    extensions: [
      'sh',
      'bash',
      'zsh',
      'ksh',
      'csh',
      'tcsh',
      'fish',
      'dash',
      'ash',
      'bashrc',
      'zshrc',
      'profile',
      'bash_profile',
      'zprofile',
      'bash_login',
    ],
    async load() {
      return wrapSync(shellParser);
    },
  }),
  LanguageDescription.of({
    name: 'PowerShell',
    extensions: ['ps1', 'psm1', 'psd1', 'ps1xml', 'psc1', 'pssc'],
    async load() {
      return wrapSync(shellParser);
    },
  }),
  LanguageDescription.of({
    name: 'Batch',
    extensions: ['bat', 'cmd', 'btm'],
    async load() {
      return wrapSync(dosBatchParser());
    },
  }),
  LanguageDescription.of({
    name: 'Dockerfile',
    extensions: ['dockerfile', 'containerfile'],
    filename: /^(Dockerfile|Containerfile|\.dockerfile|\.containerfile)$/i,
    async load() {
      return wrapSync(dockerfileParser);
    },
  }),
  LanguageDescription.of({
    name: 'YAML',
    extensions: ['yaml', 'yml'],
    async load() {
      return wrapSync(yamlParser);
    },
  }),
  LanguageDescription.of({
    name: 'TOML',
    extensions: ['toml'],
    async load() {
      return wrapSync(tomlParser);
    },
  }),
  LanguageDescription.of({
    name: 'INI',
    extensions: ['ini', 'cfg', 'conf', 'properties', 'prefs', 'reg'],
    async load() {
      return wrapSync(iniParser);
    },
  }),
  LanguageDescription.of({
    name: 'Properties',
    extensions: ['properties', 'props'],
    async load() {
      return wrapSync(propertiesParser);
    },
  }),
  LanguageDescription.of({
    name: 'SQL',
    extensions: ['sql', 'ddl', 'dml', 'mysql', 'pgsql', 'psql', 'plsql', 'tsql', 'cql', 'prisma'],
    async load() {
      return wrapSync(sqlParser);
    },
  }),
  LanguageDescription.of({
    name: 'GraphQL',
    extensions: ['graphql', 'gql', 'graphqls'],
    async load() {
      return wrapSync(graphqlParser);
    },
  }),
  LanguageDescription.of({
    name: 'Go',
    extensions: ['go'],
    async load() {
      return wrapSync(goParser);
    },
  }),
  LanguageDescription.of({
    name: 'Rust',
    extensions: ['rs'],
    async load() {
      return wrapSync(rustParser);
    },
  }),
  LanguageDescription.of({
    name: 'Java',
    extensions: ['java'],
    async load() {
      return wrapSync(javaParser);
    },
  }),
  LanguageDescription.of({
    name: 'Kotlin',
    extensions: ['kt', 'kts', 'ktm'],
    async load() {
      return wrapSync(kotlinParser);
    },
  }),
  LanguageDescription.of({
    name: 'Scala',
    extensions: ['scala', 'sc'],
    async load() {
      return wrapSync(scalaParser);
    },
  }),
  LanguageDescription.of({
    name: 'Swift',
    extensions: ['swift'],
    async load() {
      return wrapSync(swiftParser);
    },
  }),
  LanguageDescription.of({
    name: 'C#',
    extensions: ['cs', 'csx', 'cake'],
    async load() {
      return wrapSync(csharpParser);
    },
  }),
  LanguageDescription.of({
    name: 'F#',
    extensions: ['fs', 'fsx', 'fsi', 'fsscript'],
    async load() {
      return wrapSync(csharpParser);
    },
  }),
  LanguageDescription.of({
    name: 'Ruby',
    extensions: ['rb', 'rbw', 'gemspec', 'rake', 'ru', 'rxml', 'erb'],
    async load() {
      return wrapSync(rubyParser);
    },
  }),
  LanguageDescription.of({
    name: 'PHP',
    extensions: ['php', 'phtml', 'pht', 'phps', 'php3', 'php4', 'php5', 'php7', 'phar'],
    async load() {
      return wrapSync(phpParser);
    },
  }),
  LanguageDescription.of({
    name: 'Lua',
    extensions: ['lua', 'luac', 'nse'],
    async load() {
      return wrapSync(luaParser);
    },
  }),
  LanguageDescription.of({
    name: 'Perl',
    extensions: ['pl', 'pm', 't', 'pod', 'psgi'],
    async load() {
      return wrapSync(perlParser);
    },
  }),
  LanguageDescription.of({
    name: 'R',
    extensions: ['r', 'R', 'rd', 'rsx', 'Rprofile'],
    async load() {
      return wrapSync(rParser);
    },
  }),
  LanguageDescription.of({
    name: 'Haskell',
    extensions: ['hs', 'lhs', 'hsc'],
    async load() {
      return wrapSync(haskellParser);
    },
  }),
  LanguageDescription.of({
    name: 'Elixir',
    extensions: ['ex', 'exs', 'eex', 'heex', 'leex'],
    async load() {
      return wrapSync(elixirParser);
    },
  }),
  LanguageDescription.of({
    name: 'Erlang',
    extensions: ['erl', 'hrl', 'escript', 'app.src'],
    async load() {
      return wrapSync(erlangParser);
    },
  }),
  LanguageDescription.of({
    name: 'Clojure',
    extensions: ['clj', 'cljs', 'cljc', 'cljd', 'edn'],
    async load() {
      return wrapSync(defineSimpleParser({ lineComment: ';', blockComment: ['#_(', ')'] }));
    },
  }),
  LanguageDescription.of({
    name: 'Scheme',
    extensions: ['scm', 'ss', 'rkt', 'sch'],
    async load() {
      return wrapSync(defineSimpleParser({ lineComment: ';', blockComment: ['#|', '|#'] }));
    },
  }),
  LanguageDescription.of({
    name: 'Lisp',
    extensions: ['lisp', 'lsp', 'l', 'cl'],
    async load() {
      return wrapSync(defineSimpleParser({ lineComment: ';', blockComment: ['#|', '|#'] }));
    },
  }),
  LanguageDescription.of({
    name: 'OCaml',
    extensions: ['ml', 'mli', 'mll', 'mly'],
    async load() {
      return wrapSync(defineSimpleParser({ lineComment: '', blockComment: ['(*', '*)'] }));
    },
  }),
  LanguageDescription.of({
    name: 'Dart',
    extensions: ['dart'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'abstract',
            'as',
            'assert',
            'async',
            'await',
            'break',
            'case',
            'catch',
            'class',
            'const',
            'continue',
            'covariant',
            'default',
            'deferred',
            'do',
            'dynamic',
            'else',
            'enum',
            'export',
            'extends',
            'extension',
            'external',
            'factory',
            'false',
            'final',
            'finally',
            'for',
            'Function',
            'get',
            'hide',
            'if',
            'implements',
            'import',
            'in',
            'interface',
            'is',
            'late',
            'library',
            'mixin',
            'new',
            'null',
            'on',
            'operator',
            'part',
            'rethrow',
            'return',
            'sealed',
            'set',
            'show',
            'static',
            'super',
            'switch',
            'sync',
            'this',
            'throw',
            'true',
            'try',
            'typedef',
            'var',
            'void',
            'when',
            'while',
            'with',
            'yield',
          ],
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Julia',
    extensions: ['jl', 'julia'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'if',
            'elseif',
            'else',
            'end',
            'for',
            'while',
            'function',
            'return',
            'break',
            'continue',
            'do',
            'let',
            'local',
            'global',
            'const',
            'try',
            'catch',
            'finally',
            'throw',
            'begin',
            'import',
            'using',
            'export',
            'module',
            'baremodule',
            'true',
            'false',
            'nothing',
            'missing',
            'Inf',
            'NaN',
          ],
          lineComment: '#',
          blockComment: ['#=', '=#'],
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Vim script',
    extensions: ['vim', 'vimrc', 'gvimrc', 'exrc'],
    async load() {
      return wrapSync(vimParser);
    },
  }),
  LanguageDescription.of({
    name: 'Diff',
    extensions: ['diff', 'patch', 'rej'],
    async load() {
      return wrapSync(diffParser);
    },
  }),
  LanguageDescription.of({
    name: 'Protobuf',
    extensions: ['proto', 'proto3'],
    async load() {
      return wrapSync(protobufParser);
    },
  }),
  LanguageDescription.of({
    name: 'Apache Config',
    extensions: ['htaccess', 'conf'],
    async load() {
      return wrapSync(apacheParser);
    },
  }),
  LanguageDescription.of({
    name: 'Nginx Config',
    extensions: ['nginxconf'],
    async load() {
      return wrapSync(nginxParser);
    },
  }),
  LanguageDescription.of({
    name: 'CSV',
    extensions: ['csv', 'tsv', 'psv'],
    async load() {
      return wrapSync(csvParser);
    },
  }),
  LanguageDescription.of({
    name: 'Log',
    extensions: ['log', 'logs', 'out', 'err', 'trace'],
    async load() {
      return wrapSync(logParser);
    },
  }),
  LanguageDescription.of({
    name: 'Makefile',
    extensions: ['mk', 'mak', 'makefile', 'gnumakefile', 'make'],
    filename: /^(Makefile|makefile|GNUmakefile|\.mk)$/i,
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'ifeq',
            'ifneq',
            'ifdef',
            'ifndef',
            'else',
            'endif',
            'include',
            'define',
            'endef',
            'export',
            'unexport',
            'vpath',
            'override',
            'private',
            'notdir',
            'wildcard',
            'abspath',
            'realpath',
            'dir',
            'suffix',
            'basename',
            'addprefix',
            'addsuffix',
            'join',
            'word',
            'wordlist',
            'words',
            'firstword',
            'lastword',
            'origin',
            'shell',
            'call',
            'foreach',
            'file',
            'error',
            'warning',
            'info',
          ],
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'CMake',
    extensions: ['cmake', 'cmakein'],
    filename: /^(CMakeLists\.txt|\.cmake)$/i,
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'add_executable',
            'add_library',
            'add_subdirectory',
            'aux_source_directory',
            'break',
            'build_command',
            'cmake_host_system_information',
            'cmake_minimum_required',
            'cmake_parse_arguments',
            'configure_file',
            'create_test_sourcelist',
            'define_property',
            'else',
            'elseif',
            'enable_language',
            'enable_testing',
            'endforeach',
            'endfunction',
            'endif',
            'endmacro',
            'endwhile',
            'execute_process',
            'export',
            'file',
            'find_file',
            'find_library',
            'find_package',
            'find_path',
            'find_program',
            'fltk_wrap_ui',
            'foreach',
            'function',
            'get_cmake_property',
            'get_directory_property',
            'get_filename_component',
            'get_property',
            'get_source_file_property',
            'get_target_property',
            'get_test_property',
            'if',
            'include',
            'include_directories',
            'include_external_msproject',
            'include_guard',
            'install',
            'link_directories',
            'list',
            'load_cache',
            'macro',
            'make_directory',
            'mark_as_advanced',
            'math',
            'message',
            'option',
            'project',
            'qt_wrap_cpp',
            'qt_wrap_ui',
            'remove',
            'remove_definitions',
            'return',
            'separate_arguments',
            'set',
            'set_directory_properties',
            'set_property',
            'set_source_files_properties',
            'set_target_properties',
            'set_tests_properties',
            'site_name',
            'source_group',
            'string',
            'subdir_depends',
            'subdirs',
            'target_compile_definitions',
            'target_compile_features',
            'target_compile_options',
            'target_include_directories',
            'target_link_libraries',
            'target_sources',
            'try_compile',
            'try_run',
            'unset',
            'use_mangled_mesa',
            'utility_loop',
            'variable_requires',
            'while',
            'write_file',
            'ctest',
            'add_test',
          ],
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Gradle',
    extensions: ['gradle'],
    filename: /^(build\.gradle|settings\.gradle|gradle\.properties)$/i,
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'apply',
            'buildscript',
            'classpath',
            'configurations',
            'dependencies',
            'dependency',
            'ext',
            'file',
            'files',
            'group',
            'jar',
            'java',
            'javac',
            'local',
            'maven',
            'name',
            'plugin',
            'project',
            'repositories',
            'repository',
            'sourceSets',
            'subprojects',
            'test',
            'version',
            'compile',
            'runtime',
            'testCompile',
            'testRuntime',
            'api',
            'implementation',
            'compileOnly',
            'runtimeOnly',
            'annotationProcessor',
            'kapt',
            'ksp',
          ],
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Maven POM',
    extensions: ['pom', 'xml'],
    filename: /^pom\.xml$/i,
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '<!--',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'SBT',
    extensions: ['sbt'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'name',
            'version',
            'scalaVersion',
            'libraryDependencies',
            'resolvers',
            'scalacOptions',
            'javacOptions',
            'fork',
            'parallelExecution',
            'logBuffered',
            'autoCompilerPlugins',
            'addCompilerPlugin',
            'scalacOptions',
            'ivyScala',
            'crossScalaVersions',
            'crossVersion',
            'fullClasspath',
            'dependencyClasspath',
            'unmanagedClasspath',
            'unmanagedSourceDirectories',
            'unmanagedResourceDirectories',
            'sourceDirectories',
            'resourceDirectories',
          ],
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Terraform / HCL',
    extensions: ['tf', 'tfvars', 'hcl'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'provider',
            'resource',
            'variable',
            'output',
            'module',
            'data',
            'locals',
            'terraform',
            'backend',
            'required_providers',
            'required_version',
            'lifecycle',
            'depends_on',
            'count',
            'for_each',
            'dynamic',
            'true',
            'false',
            'null',
          ],
          lineComment: '#',
          blockComment: ['/*', '*/'],
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Nix',
    extensions: ['nix'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'let',
            'in',
            'with',
            'rec',
            'inherit',
            'if',
            'then',
            'else',
            'assert',
            'or',
            'and',
            'import',
            'true',
            'false',
            'null',
          ],
          lineComment: '#',
          blockComment: ['/*', '*/'],
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Caddyfile',
    extensions: ['caddyfile', 'caddy'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'C',
    extensions: ['c'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'auto',
            'break',
            'case',
            'char',
            'const',
            'continue',
            'default',
            'do',
            'double',
            'else',
            'enum',
            'extern',
            'float',
            'for',
            'goto',
            'if',
            'inline',
            'int',
            'long',
            'register',
            'restrict',
            'return',
            'short',
            'signed',
            'sizeof',
            'static',
            'struct',
            'switch',
            'typedef',
            'union',
            'unsigned',
            'void',
            'volatile',
            'while',
            '_Bool',
            '_Complex',
            '_Imaginary',
            '_Atomic',
            '_Generic',
            '_Noreturn',
            '_Static_assert',
            '_Thread_local',
          ],
          types: [
            'size_t',
            'ssize_t',
            'int8_t',
            'int16_t',
            'int32_t',
            'int64_t',
            'uint8_t',
            'uint16_t',
            'uint32_t',
            'uint64_t',
            'intptr_t',
            'uintptr_t',
            'ptrdiff_t',
            'FILE',
            'NULL',
          ],
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Objective-C',
    extensions: ['m', 'mm'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'auto',
            'break',
            'case',
            'char',
            'const',
            'continue',
            'default',
            'do',
            'double',
            'else',
            'enum',
            'extern',
            'float',
            'for',
            'goto',
            'if',
            'inline',
            'int',
            'long',
            'register',
            'restrict',
            'return',
            'short',
            'signed',
            'sizeof',
            'static',
            'struct',
            'switch',
            'typedef',
            'union',
            'unsigned',
            'void',
            'volatile',
            'while',
            '@interface',
            '@implementation',
            '@protocol',
            '@property',
            '@synthesize',
            '@dynamic',
            '@end',
            '@selector',
            '@class',
            '@autoreleasepool',
            '@try',
            '@catch',
            '@finally',
            '@throw',
            '@synchronized',
            '@public',
            '@private',
            '@protected',
            '@package',
            '@optional',
            '@required',
            '@encode',
            '@defs',
            '@compatibility_alias',
            '@autorelease',
            '@release',
            '@retain',
            '@strong',
            '@weak',
            '@copy',
            '@assign',
            '@unsafe_unretained',
            '@nonnull',
            '@nullable',
            'nonatomic',
            'atomic',
            'strong',
            'weak',
            'readwrite',
            'readonly',
            'copy',
            'assign',
            'unsafe_unretained',
          ],
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Assembly',
    extensions: ['asm', 's', 'S'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: ';',
          semicolonComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'LLVM IR',
    extensions: ['ll', 'llvm'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: ';',
          semicolonComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Verilog',
    extensions: ['v', 'vh', 'sv', 'svh'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'always',
            'and',
            'assign',
            'automatic',
            'begin',
            'buf',
            'bufif0',
            'bufif1',
            'case',
            'casex',
            'casez',
            'cell',
            'cmos',
            'config',
            'deassign',
            'default',
            'defparam',
            'design',
            'disable',
            'edge',
            'else',
            'end',
            'endcase',
            'endconfig',
            'endfunction',
            'endgenerate',
            'endmodule',
            'endprimitive',
            'endspecify',
            'endtable',
            'endtask',
            'event',
            'for',
            'force',
            'forever',
            'fork',
            'function',
            'generate',
            'genvar',
            'highz0',
            'highz1',
            'if',
            'ifnone',
            'incdir',
            'include',
            'initial',
            'inout',
            'input',
            'instance',
            'integer',
            'join',
            'large',
            'liblist',
            'library',
            'localparam',
            'macromodule',
            'medium',
            'module',
            'nand',
            'negedge',
            'nmos',
            'nor',
            'noshowcancelled',
            'not',
            'notif0',
            'notif1',
            'or',
            'output',
            'parameter',
            'pmos',
            'posedge',
            'primitive',
            'pull0',
            'pull1',
            'pulldown',
            'pullup',
            'pulsestyle_onevent',
            'pulsestyle_ondetect',
            'rcmos',
            'real',
            'realtime',
            'reg',
            'release',
            'repeat',
            'rnmos',
            'rpmos',
            'rtran',
            'rtranif0',
            'rtranif1',
            'scalared',
            'showcancelled',
            'signed',
            'small',
            'specify',
            'specparam',
            'strength',
            'strong0',
            'strong1',
            'supply0',
            'supply1',
            'table',
            'task',
            'time',
            'tran',
            'tranif0',
            'tranif1',
            'tri',
            'tri0',
            'tri1',
            'triand',
            'trior',
            'trireg',
            'unsigned',
            'use',
            'vectored',
            'wait',
            'wand',
            'weak0',
            'weak1',
            'while',
            'wire',
            'wor',
            'xnor',
            'xor',
          ],
          lineComment: '//',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'VHDL',
    extensions: ['vhd', 'vhdl', 'vho', 'vht', 'vhs'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'abs',
            'access',
            'after',
            'alias',
            'all',
            'and',
            'architecture',
            'array',
            'assert',
            'attribute',
            'begin',
            'block',
            'body',
            'buffer',
            'bus',
            'case',
            'component',
            'configuration',
            'constant',
            'disconnect',
            'downto',
            'else',
            'elsif',
            'end',
            'entity',
            'exit',
            'file',
            'for',
            'function',
            'generate',
            'generic',
            'group',
            'guarded',
            'if',
            'impure',
            'in',
            'inertial',
            'inout',
            'is',
            'label',
            'library',
            'linkage',
            'literal',
            'loop',
            'map',
            'mod',
            'nand',
            'new',
            'next',
            'nor',
            'not',
            'null',
            'of',
            'on',
            'open',
            'or',
            'others',
            'out',
            'package',
            'port',
            'postponed',
            'procedure',
            'process',
            'pure',
            'range',
            'record',
            'register',
            'reject',
            'rem',
            'report',
            'return',
            'rol',
            'ror',
            'select',
            'severity',
            'shared',
            'signal',
            'sla',
            'sll',
            'sra',
            'srl',
            'subtype',
            'then',
            'to',
            'transport',
            'type',
            'unaffected',
            'units',
            'until',
            'use',
            'variable',
            'wait',
            'when',
            'while',
            'with',
            'xnor',
            'xor',
          ],
          lineComment: '--',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Tcl',
    extensions: ['tcl', 'tk', 'itcl', 'itk'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Expect',
    extensions: ['exp'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Awk',
    extensions: ['awk'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'BEGIN',
            'END',
            'break',
            'case',
            'continue',
            'default',
            'delete',
            'do',
            'else',
            'exit',
            'for',
            'function',
            'getline',
            'if',
            'in',
            'next',
            'nextfile',
            'print',
            'printf',
            'return',
            'switch',
            'while',
          ],
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Sed',
    extensions: ['sed'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Brainfuck',
    extensions: ['bf', 'b', 'brainfuck'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Solidity',
    extensions: ['sol'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'pragma',
            'solidity',
            'contract',
            'library',
            'interface',
            'function',
            'modifier',
            'constructor',
            'event',
            'struct',
            'enum',
            'mapping',
            'public',
            'private',
            'internal',
            'external',
            'view',
            'pure',
            'payable',
            'returns',
            'return',
            'if',
            'else',
            'for',
            'while',
            'do',
            'break',
            'continue',
            'throw',
            'emit',
            'import',
            'using',
            'is',
            'virtual',
            'override',
            'abstract',
            'indexed',
            'anonymous',
            'assembly',
            'unchecked',
            'try',
            'catch',
            'revert',
            'require',
            'assert',
            'new',
            'delete',
            'this',
            'super',
            'true',
            'false',
          ],
          types: [
            'address',
            'bool',
            'string',
            'bytes',
            'int',
            'int8',
            'int16',
            'int32',
            'int64',
            'int128',
            'int256',
            'uint',
            'uint8',
            'uint16',
            'uint32',
            'uint64',
            'uint128',
            'uint256',
            'fixed',
            'ufixed',
          ],
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Cairo',
    extensions: ['cairo'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Move',
    extensions: ['move'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Zig',
    extensions: ['zig'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'const',
            'var',
            'extern',
            'export',
            'pub',
            'fn',
            'usingnamespace',
            'async',
            'await',
            'suspend',
            'resume',
            'return',
            'if',
            'else',
            'for',
            'while',
            'defer',
            'errdefer',
            'try',
            'catch',
            'throw',
            'switch',
            'case',
            'break',
            'continue',
            'struct',
            'enum',
            'union',
            'opaque',
            'error',
            'test',
            'comptime',
            'and',
            'or',
            'orelse',
            'true',
            'false',
            'null',
            'undefined',
            'this',
            'anytype',
            'anyframe',
          ],
          lineComment: '//',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Nim',
    extensions: ['nim', 'nimble'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'addr',
            'and',
            'as',
            'asm',
            'bind',
            'block',
            'break',
            'case',
            'cast',
            'concept',
            'const',
            'continue',
            'converter',
            'defer',
            'discard',
            'distinct',
            'div',
            'do',
            'echo',
            'elif',
            'else',
            'end',
            'enum',
            'except',
            'export',
            'finally',
            'for',
            'from',
            'func',
            'generic',
            'if',
            'import',
            'in',
            'include',
            'interface',
            'is',
            'iterator',
            'let',
            'macro',
            'method',
            'mixin',
            'mod',
            'nil',
            'not',
            'notin',
            'object',
            'of',
            'or',
            'out',
            'proc',
            'ptr',
            'raise',
            'ref',
            'return',
            'shl',
            'shr',
            'static',
            'template',
            'try',
            'tuple',
            'type',
            'using',
            'var',
            'when',
            'while',
            'xor',
            'yield',
          ],
          lineComment: '#',
          hashComment: true,
          blockComment: ['#[', ']#'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Crystal',
    extensions: ['cr'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'abstract',
            'as',
            'asm',
            'begin',
            'break',
            'case',
            'class',
            'def',
            'do',
            'else',
            'elsif',
            'end',
            'ensure',
            'enum',
            'extend',
            'false',
            'finally',
            'for',
            'fun',
            'if',
            'in',
            'include',
            'instance_sizeof',
            'lib',
            'macro',
            'module',
            'next',
            'nil',
            'Object',
            'of',
            'out',
            'pointerof',
            'private',
            'protected',
            'require',
            'rescue',
            'return',
            'select',
            'self',
            'sizeof',
            'struct',
            'super',
            'then',
            'true',
            'type',
            'typeof',
            'uninitialized',
            'union',
            'unless',
            'until',
            'when',
            'while',
            'with',
            'yield',
          ],
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'V (Vlang)',
    extensions: ['vsh', 'vv'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Racket',
    extensions: ['rkt', 'rktd', 'rktl'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: ';',
          blockComment: ['#|', '|#'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'TeX / LaTeX',
    extensions: ['tex', 'ltx', 'sty', 'cls', 'dtx', 'ins'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '%',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'reStructuredText',
    extensions: ['rst', 'rest'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '..',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'AsciiDoc',
    extensions: ['adoc', 'asciidoc', 'asc'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Org-mode',
    extensions: ['org'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'POD',
    extensions: ['pod', 'pl'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Man page',
    extensions: ['man', '1', '2', '3', '4', '5', '6', '7', '8'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'WebIDL',
    extensions: ['webidl'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Wasm Text (raw)',
    extensions: ['wast', 'wat'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: ';;',
          blockComment: ['(;', ';)'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'F#',
    extensions: ['fs', 'fsx', 'fsi', 'fsscript'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'abstract',
            'and',
            'as',
            'assert',
            'base',
            'begin',
            'class',
            'default',
            'delegate',
            'do',
            'done',
            'downcast',
            'downto',
            'elif',
            'else',
            'end',
            'exception',
            'extern',
            'false',
            'finally',
            'fixed',
            'for',
            'fun',
            'function',
            'global',
            'if',
            'in',
            'inherit',
            'inline',
            'interface',
            'internal',
            'lazy',
            'let',
            'match',
            'member',
            'module',
            'mutable',
            'namespace',
            'new',
            'null',
            'of',
            'open',
            'or',
            'override',
            'private',
            'public',
            'rec',
            'return',
            'sig',
            'static',
            'struct',
            'then',
            'to',
            'true',
            'try',
            'type',
            'upcast',
            'use',
            'val',
            'void',
            'when',
            'while',
            'with',
            'yield',
          ],
          lineComment: '//',
          blockComment: ['(*', '*)'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'AspectJ',
    extensions: ['aj'],
    async load() {
      return wrapSync(javaParser);
    },
  }),
  LanguageDescription.of({
    name: 'Groovy',
    extensions: ['groovy', 'gvy', 'gy', 'gsh'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'as',
            'assert',
            'boolean',
            'break',
            'byte',
            'case',
            'catch',
            'char',
            'class',
            'const',
            'continue',
            'def',
            'default',
            'do',
            'double',
            'else',
            'enum',
            'extends',
            'false',
            'finally',
            'float',
            'for',
            'goto',
            'if',
            'implements',
            'import',
            'in',
            'instanceof',
            'int',
            'interface',
            'long',
            'native',
            'new',
            'null',
            'package',
            'private',
            'protected',
            'public',
            'return',
            'short',
            'static',
            'strictfp',
            'super',
            'switch',
            'synchronized',
            'this',
            'throw',
            'throws',
            'trait',
            'transient',
            'true',
            'try',
            'void',
            'volatile',
            'while',
          ],
          lineComment: '//',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'PowerQuery / M',
    extensions: ['pq', 'pqm'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'DAX',
    extensions: ['dax'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'PL/SQL',
    extensions: ['pkb', 'pks', 'plb', 'pls', 'plsql'],
    async load() {
      return wrapSync(sqlParser);
    },
  }),
  LanguageDescription.of({
    name: 'Cypher',
    extensions: ['cyp', 'cypher'],
    async load() {
      return wrapSync(sqlParser);
    },
  }),
  LanguageDescription.of({
    name: 'SPARQL',
    extensions: ['sparql', 'rq'],
    async load() {
      return wrapSync(sqlParser);
    },
  }),
  LanguageDescription.of({
    name: 'Turtle',
    extensions: ['ttl', 'turtle'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'N-Triples',
    extensions: ['nt', 'ntriples'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'N3',
    extensions: ['n3'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'JSON5',
    extensions: ['json5'],
    async load() {
      return import('@codemirror/lang-json').then((m) => m.json());
    },
  }),
  LanguageDescription.of({
    name: 'PostCSS Config',
    extensions: ['postcssrc'],
    async load() {
      return import('@codemirror/lang-css').then((m) => m.css());
    },
  }),
  LanguageDescription.of({
    name: 'Stylus',
    extensions: ['styl'],
    async load() {
      return import('@codemirror/lang-css').then((m) => m.css());
    },
  }),
  LanguageDescription.of({
    name: 'Coq',
    extensions: ['coq', 'v'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '',
          blockComment: ['(*', '*)'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Lean',
    extensions: ['lean', 'hlean'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '--',
          blockComment: ['/-', '-/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Agda',
    extensions: ['agda'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '--',
          blockComment: ['{-', '-}'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Idris',
    extensions: ['idr', 'ipkg'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '--',
          blockComment: ['{-', '-}'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'PureScript',
    extensions: ['purs'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '--',
          blockComment: ['{-', '-}'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Elm',
    extensions: ['elm'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          keywords: [
            'module',
            'exposing',
            'import',
            'as',
            'let',
            'in',
            'if',
            'then',
            'else',
            'case',
            'of',
            'type',
            'alias',
            'port',
            'infix',
            'infixl',
            'infixr',
            'where',
            'function',
            'true',
            'false',
            'otherwise',
          ],
          lineComment: '--',
          blockComment: ['{-', '-}'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'ReasonML',
    extensions: ['re', 'rei'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
          blockComment: ['/*', '*/'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'OCaml Interface',
    extensions: ['mli'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '',
          blockComment: ['(*', '*)'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'F# Signature',
    extensions: ['fsi'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
          blockComment: ['(*', '*)'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Ada',
    extensions: ['ada', 'adb', 'ads', 'pad'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '--',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Pascal',
    extensions: ['pas', 'pp', 'p', 'inc', 'lpr', 'lfm'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
          blockComment: ['(*', '*)'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Object Pascal',
    extensions: ['dpr', 'dpk'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '//',
          blockComment: ['(*', '*)'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Fortran',
    extensions: ['f', 'f77', 'f90', 'f95', 'f03', 'f08', 'for'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '!',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'COBOL',
    extensions: ['cob', 'cbl', 'ccp', 'cobol'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'RPG',
    extensions: ['rpg', 'rpgle', 'sqlrpgle'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'ABAP',
    extensions: ['abap', 'ab4', 'flow'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '"',
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'X++',
    extensions: ['xpp'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Apex',
    extensions: ['apex', 'cls', 'trigger'],
    async load() {
      return wrapSync(javaParser);
    },
  }),
  LanguageDescription.of({
    name: 'Visual Basic',
    extensions: ['vb', 'vbs', 'vbproj', 'vbp'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: "'",
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'VBScript',
    extensions: ['vbscript'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: "'",
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'COBOL Script',
    extensions: ['cbl'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Pascal Script',
    extensions: ['pps'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Go Template',
    extensions: ['gohtml', 'gotmpl'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'Handlebars',
    extensions: ['hbs', 'handlebars', 'mustache'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'EJS',
    extensions: ['ejs', 'ect', 'eta'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'Jinja',
    extensions: ['jinja', 'jinja2', 'j2', 'njk', 'twig'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'Liquid',
    extensions: ['liquid'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'Pug',
    extensions: ['pug', 'jade'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'ERB',
    extensions: ['erb'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'Razor',
    extensions: ['cshtml', 'razor'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'Smarty',
    extensions: ['tpl', 'smarty'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'Blade',
    extensions: ['blade.php', 'blade'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'Mako',
    extensions: ['mako', 'mao'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'Haml',
    extensions: ['haml'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Slim',
    extensions: ['slim'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Textile',
    extensions: ['textile'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Creole',
    extensions: ['creole'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'MediaWiki',
    extensions: ['mediawiki', 'wiki'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'DokuWiki',
    extensions: ['dokuwiki'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'TiddlyWiki',
    extensions: ['tid'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'JSDoc',
    extensions: ['jsdoc'],
    async load() {
      return import('@codemirror/lang-javascript').then((m) => m.javascript());
    },
  }),
  LanguageDescription.of({
    name: 'TSDoc',
    extensions: ['tsdoc'],
    async load() {
      return import('@codemirror/lang-javascript').then((m) => m.javascript());
    },
  }),
  LanguageDescription.of({
    name: 'Cython',
    extensions: ['pyx', 'pxd', 'pxi'],
    async load() {
      return import('@codemirror/lang-python').then((m) => m.python());
    },
  }),
  LanguageDescription.of({
    name: 'Pyrex',
    extensions: ['pyrex'],
    async load() {
      return import('@codemirror/lang-python').then((m) => m.python());
    },
  }),
  LanguageDescription.of({
    name: 'NumPy',
    extensions: ['numpy'],
    async load() {
      return import('@codemirror/lang-python').then((m) => m.python());
    },
  }),
  LanguageDescription.of({
    name: 'Jupyter',
    extensions: ['ipynb'],
    async load() {
      return import('@codemirror/lang-python').then((m) => m.python());
    },
  }),
  LanguageDescription.of({
    name: 'Bazel',
    extensions: ['bzl', 'bazel', 'BUILD', 'WORKSPACE'],
    filename: /^(BUILD|WORKSPACE|BUILD\.bazel|WORKSPACE\.bazel)$/i,
    async load() {
      return import('@codemirror/lang-python').then((m) => m.python());
    },
  }),
  LanguageDescription.of({
    name: 'Starlark',
    extensions: ['star', 'starlark'],
    async load() {
      return import('@codemirror/lang-python').then((m) => m.python());
    },
  }),
  LanguageDescription.of({
    name: 'Bazel',
    extensions: ['bzl', 'bazel'],
    async load() {
      return import('@codemirror/lang-python').then((m) => m.python());
    },
  }),
  LanguageDescription.of({
    name: 'Buck',
    extensions: ['bzl'],
    async load() {
      return import('@codemirror/lang-python').then((m) => m.python());
    },
  }),
  LanguageDescription.of({
    name: 'Pkl',
    extensions: ['pkl'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'CUE',
    extensions: ['cue'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Jsonnet',
    extensions: ['jsonnet', 'libsonnet'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'HCL',
    extensions: ['hcl'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Rego',
    extensions: ['rego'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Sentinel',
    extensions: ['sentinel'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Conftest',
    extensions: ['rego'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Excel Formula',
    extensions: ['xlsx', 'xls', 'xlsm'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'AppleScript',
    extensions: ['applescript', 'scpt', 'scptd'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '--',
          blockComment: ['(*', '*)'],
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Bash',
    extensions: ['bash'],
    async load() {
      return wrapSync(shellParser);
    },
  }),
  LanguageDescription.of({
    name: 'Zsh',
    extensions: ['zsh'],
    async load() {
      return wrapSync(shellParser);
    },
  }),
  LanguageDescription.of({
    name: 'Fish',
    extensions: ['fish'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Nu',
    extensions: ['nu'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Csh',
    extensions: ['csh'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Tcsh',
    extensions: ['tcsh'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Ksh',
    extensions: ['ksh'],
    async load() {
      return wrapSync(
        defineSimpleParser({
          lineComment: '#',
          hashComment: true,
        }),
      );
    },
  }),
  LanguageDescription.of({
    name: 'Env',
    extensions: ['env', 'envrc'],
    filename: /^\.env(\..+)?$/i,
    async load() {
      return wrapSync(propertiesParser);
    },
  }),
  LanguageDescription.of({
    name: 'EditorConfig',
    extensions: ['editorconfig'],
    filename: /^\.editorconfig$/i,
    async load() {
      return wrapSync(iniParser);
    },
  }),
  LanguageDescription.of({
    name: 'Git Attributes',
    extensions: ['gitattributes'],
    filename: /^\.gitattributes$/i,
    async load() {
      return wrapSync(iniParser);
    },
  }),
  LanguageDescription.of({
    name: 'Git Ignore',
    extensions: ['gitignore'],
    filename: /^\.gitignore$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Git Modules',
    extensions: ['gitmodules'],
    filename: /^\.gitmodules$/i,
    async load() {
      return wrapSync(iniParser);
    },
  }),
  LanguageDescription.of({
    name: 'Git Config',
    extensions: ['gitconfig'],
    filename: /^\.gitconfig$/i,
    async load() {
      return wrapSync(iniParser);
    },
  }),
  LanguageDescription.of({
    name: 'Docker Ignore',
    extensions: ['dockerignore'],
    filename: /^\.dockerignore$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Vercel Ignore',
    extensions: ['vercelignore'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'NPMRC',
    extensions: ['npmrc'],
    filename: /^\.npmrc$/i,
    async load() {
      return wrapSync(iniParser);
    },
  }),
  LanguageDescription.of({
    name: 'YarnRC',
    extensions: ['yarnrc', 'yarnrc.yml'],
    filename: /^\.yarnrc(\.yml)?$/i,
    async load() {
      return wrapSync(yamlParser);
    },
  }),
  LanguageDescription.of({
    name: 'PNPM Workspace',
    extensions: ['pnpm-workspace.yaml'],
    async load() {
      return wrapSync(yamlParser);
    },
  }),
  LanguageDescription.of({
    name: 'Babel Config',
    extensions: ['babelrc', 'babelrc.js', 'babelrc.json'],
    filename: /^(\.babelrc|babelrc\.json|babel\.config\.(js|json|cjs|mjs|ts))$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'ESLint Config',
    extensions: ['eslintrc'],
    filename: /^\.eslintrc(\.json|\.yml|\.yaml|\.js|\.cjs|\.mjs)?$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Prettier Config',
    extensions: ['prettierrc'],
    filename: /^\.prettierrc(\.json|\.yml|\.yaml|\.js|\.cjs|\.mjs|\.toml)?$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Stylelint Config',
    extensions: ['stylelintrc'],
    filename: /^\.stylelintrc(\.json|\.yml|\.yaml|\.js|\.cjs|\.mjs)?$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Browserslist',
    extensions: ['browserslistrc'],
    filename: /^\.browserslistrc$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Wget',
    extensions: ['wget'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'robots.txt',
    extensions: ['robots'],
    filename: /^robots\.txt$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'humans.txt',
    extensions: ['humans'],
    filename: /^humans\.txt$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'security.txt',
    extensions: ['security'],
    filename: /^security\.txt$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'favicon',
    extensions: ['ico'],
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: '.htaccess',
    extensions: ['htaccess'],
    filename: /^\.htaccess$/i,
    async load() {
      return wrapSync(plainTextParser);
    },
  }),
  LanguageDescription.of({
    name: 'Web Manifest',
    extensions: ['webmanifest'],
    filename: /manifest\.webmanifest$/i,
    async load() {
      return import('@codemirror/lang-json').then((m) => m.json());
    },
  }),
  LanguageDescription.of({
    name: 'Service Worker',
    extensions: ['service-worker.js'],
    async load() {
      return import('@codemirror/lang-javascript').then((m) => m.javascript());
    },
  }),
  LanguageDescription.of({
    name: 'TypeScript Declaration',
    extensions: ['d.mts', 'd.cts'],
    async load() {
      return import('@codemirror/lang-javascript').then((m) => m.javascript({ typescript: true }));
    },
  }),
  LanguageDescription.of({
    name: 'Vue Script',
    extensions: ['vue'],
    async load() {
      return import('@codemirror/lang-vue').then((m) => m.vue());
    },
  }),
  LanguageDescription.of({
    name: 'Svelte',
    extensions: ['svelte'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'Astro',
    extensions: ['astro'],
    async load() {
      return import('@codemirror/lang-html').then((m) => m.html());
    },
  }),
  LanguageDescription.of({
    name: 'JSX/TSX',
    extensions: ['jsx', 'tsx'],
    async load() {
      return import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true, typescript: true }));
    },
  }),
];

/*
 *  Helper: lazily-evaluated parser for the few I forgot to wire synchronously
 */
function dosBatchParser() {
  return defineSimpleParser({
    keywords: [
      'if',
      'else',
      'for',
      'in',
      'do',
      'goto',
      'call',
      'set',
      'setlocal',
      'endlocal',
      'if',
      'else',
      'not',
      'exist',
      'defined',
      'errorlevel',
      'equ',
      'neq',
      'lss',
      'leq',
      'gtr',
      'geq',
      'echo',
      'echo.',
      'pause',
      'exit',
      'exit /b',
      'rem',
    ],
    lineComment: 'rem',
    semicolonComment: true,
  });
}

/*
 * =============================================================================
 *  Plain text fallback
 * =============================================================================
 */

const plainTextDescription = LanguageDescription.of({
  name: 'Plain Text',
  async load() {
    return wrapSync(plainTextParser);
  },
});

/*
 * =============================================================================
 *  Public API
 * =============================================================================
 */

export const supportedLanguages: LanguageDescription[] = [
  ...realPackageDescriptions,
  ...streamDescriptions,
  plainTextDescription,
];

/**
 * Resolve a CodeMirror LanguageSupport for a file based on its filename.
 * Falls back to plain text if no match.
 */
export async function getLanguage(fileName: string) {
  const match = LanguageDescription.matchFilename(supportedLanguages, fileName);

  if (match) {
    return await match.load();
  }

  const fallback = LanguageDescription.matchFilename([plainTextDescription], fileName);

  if (fallback) {
    return await fallback.load();
  }

  return undefined;
}

/**
 * Synchronously resolve a LanguageSupport for a file. Returns undefined if the
 * matching language uses an async dynamic import (real CodeMirror packages).
 */
export function getLanguageSync(fileName: string) {
  const match = LanguageDescription.matchFilename(supportedLanguages, fileName);

  if (!match) {
    return undefined;
  }

  try {
    const result = match.load();

    if (result instanceof Promise) {
      return undefined;
    }

    return result;
  } catch {
    return undefined;
  }
}

/**
 * Pre-warm the dynamic-import cache for the most common languages.
 * Call this on app start or when the user opens a project to reduce
 * first-open latency.
 */
export async function preloadCommonLanguages(): Promise<void> {
  const common = ['javascript', 'typescript', 'json', 'html', 'css', 'markdown', 'python', 'yaml'];

  await Promise.allSettled(
    supportedLanguages.filter((lang) => common.includes(lang.name.toLowerCase())).map((lang) => lang.load()),
  );
}

/**
 * Return the list of all supported file extensions, sorted alphabetically.
 * Useful for UI (e.g., "Open file" picker showing supported types).
 */
export function getAllSupportedExtensions(): string[] {
  const seen = new Set<string>();

  for (const lang of supportedLanguages) {
    for (const ext of lang.extensions ?? []) {
      seen.add(ext);
    }
  }

  return Array.from(seen).sort();
}

/**
 * The list of supported language names. Useful for UI selectors.
 */
export function getAllSupportedLanguageNames(): string[] {
  return supportedLanguages.map((lang) => lang.name).sort();
}
