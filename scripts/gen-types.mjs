#!/usr/bin/env node
/**
 * src/types.ts from Orboni's OpenAPI document: one exported type per schema,
 * with the schema's descriptions as doc comments, so an editor shows what
 * each field means.
 *
 *   node scripts/gen-types.mjs [path-or-url]   (default https://orboni.com/openapi.json)
 *
 * The document is built from the API's code at each request, so running this
 * after an API change brings the types along; commit the result.
 */
import { readFile, writeFile } from 'node:fs/promises';

const source = process.argv[2] ?? 'https://orboni.com/openapi.json';
const text = /^https?:\/\//.test(source)
    ? await (await fetch(source)).text()
    : await readFile(source, 'utf8');
const doc = JSON.parse(text);
const schemas = doc.components.schemas;

/** Schemas whose name would hide a global of the language: \`Error\` is the error body. */
const RENAMED = { Error: 'ErrorResponse' };
const named = (name) => RENAMED[name] ?? name;

/** The webhook events' names: the one place a type is not a schema of its own. */
const eventTypes = Object.keys(doc.webhooks ?? {});

function comment(text, indent) {
    if (!text) {
        return '';
    }
    const lines = String(text).replace(/\*\//g, '*\\/').split('\n');
    if (lines.length === 1) {
        return `${indent}/** ${lines[0]} */\n`;
    }

    return `${indent}/**\n${lines.map((l) => `${indent} *${l ? ' ' + l : ''}`).join('\n')}\n${indent} */\n`;
}

function literal(value) {
    return value === null ? 'null' : JSON.stringify(value);
}

/** A schema as a TypeScript type expression. */
function type(schema, indent) {
    if (!schema || Object.keys(schema).length === 0) {
        return 'unknown';
    }
    if (schema.$ref) {
        return named(schema.$ref.split('/').pop());
    }
    if ('const' in schema) {
        return literal(schema.const);
    }
    if (schema.oneOf || schema.anyOf) {
        return [...new Set((schema.oneOf ?? schema.anyOf).map((s) => type(s, indent)))].join(' | ');
    }
    if (schema.allOf) {
        return schema.allOf.map((s) => type(s, indent)).join(' & ');
    }
    if (schema.enum) {
        return schema.enum.map(literal).join(' | ');
    }

    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const parts = types.map((t) => {
        switch (t) {
            case 'string':
                return 'string';
            case 'integer':
            case 'number':
                return 'number';
            case 'boolean':
                return 'boolean';
            case 'null':
                return 'null';
            case 'array': {
                const item = type(schema.items, indent);

                return /[|&]/.test(item) ? `Array<${item}>` : `${item}[]`;
            }
            case 'object':
            case undefined:
                return object(schema, indent);
            default:
                return 'unknown';
        }
    });

    return [...new Set(parts)].join(' | ');
}

function object(schema, indent) {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const inner = indent + '    ';
    let body = '';
    for (const [name, prop] of Object.entries(properties)) {
        const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
        body += comment(prop.description, inner);
        body += `${inner}${key}${required.has(name) ? '' : '?'}: ${type(prop, inner)};\n`;
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        body += `${inner}[key: string]: ${type(schema.additionalProperties, inner)};\n`;
    } else if (schema.additionalProperties === true || (!schema.properties && schema.type === 'object')) {
        body += `${inner}[key: string]: unknown;\n`;
    }

    return body === '' ? 'Record<string, never>' : `{\n${body}${indent}}`;
}

let out = `// Generated from ${source.startsWith('http') ? source : "Orboni's OpenAPI document"} by scripts/gen-types.mjs. Do not edit.\n\n`;
for (const [name, schema] of Object.entries(schemas)) {
    out += comment(schema.description, '');
    const expr = type(schema, '');
    out += expr.startsWith('{') ? `export interface ${named(name)} ${expr}\n\n` : `export type ${named(name)} = ${expr};\n\n`;
}
out += `/** Every event type a webhook can carry. */\nexport type EventType = ${eventTypes.map(literal).join(' | ')};\n`;

await writeFile(new URL('../src/types.ts', import.meta.url), out);
console.log(`src/types.ts: ${Object.keys(schemas).length} schemas, ${eventTypes.length} event types`);
