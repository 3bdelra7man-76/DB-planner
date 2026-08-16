import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, ReactFlowProvider, } from '@xyflow/react';
import { AlertTriangle, Braces, CheckCircle2, CircleDot, Clipboard, Download, FileJson2, Grid3X3, KeyRound, Link2, ListChecks, Network, PanelRight, Plus, Rows3, Sparkles, Table2, Trash2, Upload, } from 'lucide-react';
import { CARDINALITIES, DELETE_ACTIONS, FIELD_TYPES, TYPE_COLORS, createBlankSchema, createEnum, createField, createId, createIndex, createNote, createTable, createTemplateSchema, normalizeSchema, parseFieldHandle, sourceHandleId, targetHandleId, touchSchema, validateSchema, } from './schema';
const STORAGE_KEY = 'db-schema-planner:draft:v1';
function TableNode({ data, selected }) {
    const table = data.table;
    const issueCount = data.issues.length;
    return (_jsxs("div", { className: `schema-node table-node ${selected ? 'is-selected' : ''}`, children: [_jsx("div", { className: "node-accent" }), _jsxs("div", { className: "node-header", children: [_jsx("div", { className: "node-icon node-icon-table", children: _jsx(Table2, { size: 18 }) }), _jsxs("div", { className: "node-title-wrap", children: [_jsx("strong", { className: "node-title", children: table.name || 'untitled_table' }), _jsxs("span", { children: [table.fields.length, " fields"] })] }), issueCount > 0 ? (_jsxs("span", { className: "node-alert", title: `${issueCount} validation warning(s)`, children: [_jsx(AlertTriangle, { size: 14 }), issueCount] })) : (_jsx("span", { className: "node-clean", title: "No validation issues", children: _jsx(CheckCircle2, { size: 14 }) }))] }), _jsx("div", { className: "field-list", children: table.fields.map((field) => (_jsxs("div", { className: `field-row nodrag nopan ${data.selectedFieldId === field.id ? 'is-active' : ''}`, role: "button", tabIndex: 0, onClick: (event) => {
                        event.stopPropagation();
                        data.onSelectField(table.id, field.id);
                    }, onKeyDown: (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            data.onSelectField(table.id, field.id);
                        }
                    }, children: [_jsx(Handle, { type: "target", position: Position.Left, id: targetHandleId(field.id), className: "field-handle field-handle-left" }), _jsxs("span", { className: "field-name", children: [field.primaryKey ? _jsx(KeyRound, { size: 12 }) : field.type === 'relation' ? _jsx(Link2, { size: 12 }) : _jsx(CircleDot, { size: 10 }), field.name || 'unnamed'] }), _jsxs("span", { className: "field-flags", children: [field.required ? _jsx("span", { title: "Required", children: "NN" }) : null, field.unique ? _jsx("span", { title: "Unique", children: "UQ" }) : null] }), _jsx("span", { className: "type-pill", style: { '--type-color': TYPE_COLORS[field.type] }, children: field.type }), _jsx(Handle, { type: "source", position: Position.Right, id: sourceHandleId(field.id), className: "field-handle field-handle-right" })] }, field.id))) })] }));
}
function EnumNode({ data, selected }) {
    return (_jsxs("div", { className: `schema-node enum-node ${selected ? 'is-selected' : ''}`, children: [_jsx("div", { className: "node-accent enum-accent" }), _jsxs("div", { className: "node-header", children: [_jsx("div", { className: "node-icon node-icon-enum", children: _jsx(ListChecks, { size: 18 }) }), _jsxs("div", { className: "node-title-wrap", children: [_jsx("strong", { className: "node-title", children: data.schemaEnum.name || 'unnamed_enum' }), _jsxs("span", { children: [data.schemaEnum.values.length, " values"] })] })] }), _jsxs("div", { className: "enum-values", children: [data.schemaEnum.values.slice(0, 6).map((value) => (_jsx("span", { children: value }, value))), data.schemaEnum.values.length > 6 ? _jsxs("span", { children: ["+", data.schemaEnum.values.length - 6] }) : null] })] }));
}
function NoteNode({ data, selected }) {
    return (_jsxs("div", { className: `schema-node note-node ${selected ? 'is-selected' : ''}`, children: [_jsx("div", { className: "node-accent note-accent" }), _jsxs("div", { className: "node-header", children: [_jsx("div", { className: "node-icon node-icon-note", children: _jsx(Braces, { size: 18 }) }), _jsxs("div", { className: "node-title-wrap", children: [_jsx("strong", { className: "node-title", children: data.note.title || 'Note' }), _jsx("span", { children: "schema context" })] })] }), _jsx("p", { children: data.note.body })] }));
}
const nodeTypes = {
    tableNode: TableNode,
    enumNode: EnumNode,
    noteNode: NoteNode,
};
export default function App() {
    return (_jsx(ReactFlowProvider, { children: _jsx(PlannerApp, {}) }));
}
function PlannerApp() {
    const [schema, setSchema] = usePersistentSchema();
    const [selection, setSelection] = useState({ kind: 'canvas' });
    const [panelTab, setPanelTab] = useState('inspect');
    const [notice, setNotice] = useState('');
    const fileInputRef = useRef(null);
    const issues = useMemo(() => validateSchema(schema), [schema]);
    const jsonPreview = useMemo(() => JSON.stringify(schema, null, 2), [schema]);
    const updateSchema = useCallback((updater) => {
        setSchema((current) => touchSchema(updater(current)));
    }, [setSchema]);
    const selectField = useCallback((tableId, fieldId) => {
        setSelection({ kind: 'field', tableId, fieldId });
        setPanelTab('inspect');
    }, []);
    const nodes = useMemo(() => {
        const tableNodes = schema.tables.map((table) => ({
            id: table.id,
            type: 'tableNode',
            position: table.position,
            data: {
                table,
                selectedFieldId: selection.kind === 'field' && selection.tableId === table.id ? selection.fieldId : undefined,
                issues: issues.filter((issue) => issue.id.includes(table.id) || issue.message.includes(table.name)),
                onSelectField: selectField,
            },
        }));
        const enumNodes = schema.enums.map((schemaEnum) => ({
            id: schemaEnum.id,
            type: 'enumNode',
            position: schemaEnum.position,
            data: { schemaEnum },
        }));
        const noteNodes = schema.notes.map((note) => ({
            id: note.id,
            type: 'noteNode',
            position: note.position,
            data: { note },
        }));
        return [...tableNodes, ...enumNodes, ...noteNodes];
    }, [issues, schema.enums, schema.notes, schema.tables, selectField, selection]);
    const edges = useMemo(() => {
        return schema.relations.map((relation) => {
            const isSelected = selection.kind === 'relation' && selection.relationId === relation.id;
            return {
                id: relation.id,
                source: relation.from.tableId,
                target: relation.to.tableId,
                sourceHandle: sourceHandleId(relation.from.fieldId),
                targetHandle: targetHandleId(relation.to.fieldId),
                type: 'smoothstep',
                label: relation.label || relation.cardinality,
                animated: isSelected,
                markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
                style: {
                    stroke: isSelected ? '#d1495b' : '#276f86',
                    strokeWidth: isSelected ? 3 : 2,
                },
                labelStyle: {
                    fill: '#1f2d2e',
                    fontWeight: 700,
                    fontSize: 12,
                },
                labelBgStyle: {
                    fill: '#fffaf0',
                    fillOpacity: 0.92,
                },
            };
        });
    }, [schema.relations, selection]);
    useEffect(() => {
        if (notice) {
            const timeout = window.setTimeout(() => setNotice(''), 2400);
            return () => window.clearTimeout(timeout);
        }
        return undefined;
    }, [notice]);
    useEffect(() => {
        if (selection.kind === 'table' && !schema.tables.some((table) => table.id === selection.tableId)) {
            setSelection({ kind: 'canvas' });
        }
        if (selection.kind === 'field') {
            const table = schema.tables.find((candidate) => candidate.id === selection.tableId);
            if (!table || !table.fields.some((field) => field.id === selection.fieldId)) {
                setSelection({ kind: 'canvas' });
            }
        }
        if (selection.kind === 'relation' && !schema.relations.some((relation) => relation.id === selection.relationId)) {
            setSelection({ kind: 'canvas' });
        }
        if (selection.kind === 'enum' && !schema.enums.some((schemaEnum) => schemaEnum.id === selection.enumId)) {
            setSelection({ kind: 'canvas' });
        }
        if (selection.kind === 'note' && !schema.notes.some((note) => note.id === selection.noteId)) {
            setSelection({ kind: 'canvas' });
        }
    }, [schema.enums, schema.notes, schema.relations, schema.tables, selection]);
    const onNodesChange = useCallback((changes) => {
        const removedIds = new Set();
        const positions = new Map();
        changes.forEach((change) => {
            if (change.type === 'remove') {
                removedIds.add(change.id);
            }
            if (change.type === 'position' && change.position) {
                positions.set(change.id, change.position);
            }
        });
        if (!removedIds.size && !positions.size) {
            return;
        }
        updateSchema((current) => {
            const removedTableIds = new Set(current.tables.filter((table) => removedIds.has(table.id)).map((table) => table.id));
            const removedEnumIds = new Set(current.enums.filter((schemaEnum) => removedIds.has(schemaEnum.id)).map((schemaEnum) => schemaEnum.id));
            return {
                ...current,
                tables: current.tables
                    .filter((table) => !removedIds.has(table.id))
                    .map((table) => ({
                    ...table,
                    position: positions.get(table.id) ?? table.position,
                    fields: table.fields.map((field) => field.enumId && removedEnumIds.has(field.enumId) ? { ...field, enumId: undefined } : field),
                    indexes: table.indexes
                        .map((index) => ({ ...index, fields: index.fields.filter((fieldId) => table.fields.some((field) => field.id === fieldId)) }))
                        .filter((index) => index.fields.length > 0),
                })),
                relations: current.relations.filter((relation) => !removedTableIds.has(relation.from.tableId) && !removedTableIds.has(relation.to.tableId)),
                enums: current.enums
                    .filter((schemaEnum) => !removedIds.has(schemaEnum.id))
                    .map((schemaEnum) => ({ ...schemaEnum, position: positions.get(schemaEnum.id) ?? schemaEnum.position })),
                notes: current.notes
                    .filter((note) => !removedIds.has(note.id))
                    .map((note) => ({ ...note, position: positions.get(note.id) ?? note.position })),
            };
        });
    }, [updateSchema]);
    const onEdgesChange = useCallback((changes) => {
        const removedIds = changes.filter((change) => change.type === 'remove').map((change) => change.id);
        if (!removedIds.length) {
            return;
        }
        updateSchema((current) => ({
            ...current,
            relations: current.relations.filter((relation) => !removedIds.includes(relation.id)),
        }));
    }, [updateSchema]);
    const onConnect = useCallback((connection) => {
        const sourceFieldId = parseFieldHandle(connection.sourceHandle);
        const targetFieldId = parseFieldHandle(connection.targetHandle);
        if (!connection.source || !connection.target || !sourceFieldId || !targetFieldId) {
            return;
        }
        if (connection.source === connection.target && sourceFieldId === targetFieldId) {
            setNotice('Pick two different fields for a relationship.');
            return;
        }
        updateSchema((current) => {
            const duplicate = current.relations.some((relation) => relation.from.tableId === connection.source &&
                relation.from.fieldId === sourceFieldId &&
                relation.to.tableId === connection.target &&
                relation.to.fieldId === targetFieldId);
            if (duplicate) {
                setNotice('That relationship already exists.');
                return current;
            }
            const fromTable = current.tables.find((table) => table.id === connection.source);
            const toTable = current.tables.find((table) => table.id === connection.target);
            const fromField = fromTable?.fields.find((field) => field.id === sourceFieldId);
            const relation = {
                id: createId('rel'),
                from: { tableId: connection.source, fieldId: sourceFieldId },
                to: { tableId: connection.target, fieldId: targetFieldId },
                cardinality: 'many-to-one',
                onDelete: 'restrict',
                label: fromField && toTable ? `${fromField.name} -> ${toTable.name}` : 'relationship',
            };
            setSelection({ kind: 'relation', relationId: relation.id });
            setPanelTab('inspect');
            return { ...current, relations: [...current.relations, relation] };
        });
    }, [updateSchema]);
    const selected = useSelectedEntity(schema, selection);
    const issueCounts = getIssueCounts(issues);
    const addTable = useCallback(() => {
        const count = schema.tables.length;
        const table = createTable(uniqueName('new_table', schema.tables.map((item) => item.name)), {
            x: 120 + (count % 3) * 360,
            y: 120 + Math.floor(count / 3) * 280,
        });
        updateSchema((current) => ({ ...current, tables: [...current.tables, table] }));
        setSelection({ kind: 'table', tableId: table.id });
        setPanelTab('inspect');
    }, [schema.tables, updateSchema]);
    const addEnumNode = useCallback(() => {
        const schemaEnum = createEnum({
            x: 180 + (schema.enums.length % 3) * 300,
            y: 470 + Math.floor(schema.enums.length / 3) * 220,
        });
        schemaEnum.name = uniqueName('enum_values', schema.enums.map((item) => item.name));
        updateSchema((current) => ({ ...current, enums: [...current.enums, schemaEnum] }));
        setSelection({ kind: 'enum', enumId: schemaEnum.id });
        setPanelTab('inspect');
    }, [schema.enums, updateSchema]);
    const addNoteNode = useCallback(() => {
        const note = createNote({
            x: 220 + (schema.notes.length % 3) * 320,
            y: 540 + Math.floor(schema.notes.length / 3) * 210,
        });
        updateSchema((current) => ({ ...current, notes: [...current.notes, note] }));
        setSelection({ kind: 'note', noteId: note.id });
        setPanelTab('inspect');
    }, [schema.notes, updateSchema]);
    const replaceSchema = useCallback((nextSchema) => {
        setSchema(touchSchema(nextSchema));
        setSelection({ kind: 'canvas' });
        setPanelTab('inspect');
    }, [setSchema]);
    const exportJson = useCallback(() => {
        const exportSchema = touchSchema(schema);
        const fileName = `${slugify(exportSchema.project.name || 'schema')}.json`;
        const blob = new Blob([JSON.stringify(exportSchema, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        setNotice(`Exported ${fileName}`);
    }, [schema]);
    const copyJson = useCallback(async () => {
        const text = JSON.stringify(touchSchema(schema), null, 2);
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            }
            else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setNotice('Schema JSON copied.');
        }
        catch {
            setNotice('Clipboard blocked by the browser.');
        }
    }, [schema]);
    const importJson = useCallback((file) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result));
                const normalized = normalizeSchema(parsed);
                replaceSchema(normalized);
                setNotice(`Imported ${file.name}`);
            }
            catch (error) {
                setNotice(error instanceof Error ? error.message : 'Import failed.');
            }
        };
        reader.readAsText(file);
    }, [replaceSchema]);
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "brand-block", children: [_jsx("div", { className: "brand-mark", children: _jsx(Network, { size: 22 }) }), _jsxs("div", { children: [_jsx("span", { children: "DB Schema Planner" }), _jsx("input", { value: schema.project.name, "aria-label": "Project name", onChange: (event) => updateSchema((current) => ({
                                            ...current,
                                            project: { ...current.project, name: event.target.value },
                                        })) })] })] }), _jsxs("div", { className: "toolbar-actions", children: [_jsxs("button", { type: "button", className: "ghost-button", title: "Start blank schema", onClick: () => replaceSchema(createBlankSchema()), children: [_jsx(FileJson2, { size: 17 }), "Blank"] }), _jsxs("button", { type: "button", className: "ghost-button", title: "Import JSON", onClick: () => fileInputRef.current?.click(), children: [_jsx(Upload, { size: 17 }), "Import"] }), _jsxs("button", { type: "button", className: "ghost-button", title: "Copy JSON", onClick: copyJson, children: [_jsx(Clipboard, { size: 17 }), "Copy"] }), _jsxs("button", { type: "button", className: "primary-button", title: "Export JSON", onClick: exportJson, children: [_jsx(Download, { size: 17 }), "Export JSON"] }), _jsx("input", { ref: fileInputRef, className: "hidden-input", type: "file", accept: "application/json,.json", onChange: (event) => {
                                    const file = event.target.files?.[0];
                                    if (file) {
                                        importJson(file);
                                    }
                                    event.target.value = '';
                                } })] })] }), _jsxs("main", { className: "planner-layout", children: [_jsxs("aside", { className: "left-rail", children: [_jsxs("div", { className: "rail-section", children: [_jsx("span", { className: "section-label", children: "Create" }), _jsxs("button", { type: "button", className: "tool-button", onClick: addTable, children: [_jsx(Table2, { size: 18 }), "Table"] }), _jsxs("button", { type: "button", className: "tool-button", onClick: addEnumNode, children: [_jsx(ListChecks, { size: 18 }), "Enum"] }), _jsxs("button", { type: "button", className: "tool-button", onClick: addNoteNode, children: [_jsx(Braces, { size: 18 }), "Note"] })] }), _jsxs("div", { className: "rail-section", children: [_jsx("span", { className: "section-label", children: "Templates" }), _jsxs("button", { type: "button", className: "template-button", onClick: () => replaceSchema(createTemplateSchema('auth')), children: [_jsx(Sparkles, { size: 16 }), "Auth"] }), _jsxs("button", { type: "button", className: "template-button", onClick: () => replaceSchema(createTemplateSchema('commerce')), children: [_jsx(Grid3X3, { size: 16 }), "Shop"] }), _jsxs("button", { type: "button", className: "template-button", onClick: () => replaceSchema(createTemplateSchema('content')), children: [_jsx(Rows3, { size: 16 }), "CMS"] })] }), _jsxs("div", { className: "schema-health", children: [_jsx("span", { className: "section-label", children: "Health" }), _jsxs("div", { className: "health-ring", children: [_jsx("span", { children: issueCounts.errors }), _jsx("small", { children: "errors" })] }), _jsxs("div", { className: "health-grid", children: [_jsxs("span", { children: [_jsx("strong", { children: schema.tables.length }), "tables"] }), _jsxs("span", { children: [_jsx("strong", { children: schema.relations.length }), "links"] }), _jsxs("span", { children: [_jsx("strong", { children: issueCounts.warnings }), "warnings"] })] })] })] }), _jsxs("section", { className: "canvas-panel", children: [notice ? _jsx("div", { className: "toast", children: notice }) : null, _jsxs(ReactFlow, { nodes: nodes, edges: edges, nodeTypes: nodeTypes, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, onNodeClick: (_, node) => {
                                    if (node.type === 'tableNode') {
                                        setSelection({ kind: 'table', tableId: node.id });
                                    }
                                    else if (node.type === 'enumNode') {
                                        setSelection({ kind: 'enum', enumId: node.id });
                                    }
                                    else if (node.type === 'noteNode') {
                                        setSelection({ kind: 'note', noteId: node.id });
                                    }
                                    setPanelTab('inspect');
                                }, onPaneClick: () => setSelection({ kind: 'canvas' }), onEdgeClick: (_, edge) => {
                                    setSelection({ kind: 'relation', relationId: edge.id });
                                    setPanelTab('inspect');
                                }, fitView: true, minZoom: 0.3, maxZoom: 1.7, connectOnClick: false, deleteKeyCode: ['Backspace', 'Delete'], children: [_jsx(Background, { color: "#d9d0bd", gap: 22, size: 1.2 }), _jsx(MiniMap, { pannable: true, zoomable: true, nodeBorderRadius: 8, nodeStrokeWidth: 2, nodeColor: (node) => {
                                            if (node.type === 'enumNode')
                                                return '#e2b844';
                                            if (node.type === 'noteNode')
                                                return '#e8795d';
                                            return '#5bb7a8';
                                        } }), _jsx(Controls, { position: "bottom-left", showInteractive: false })] })] }), _jsxs("aside", { className: "right-panel", children: [_jsxs("div", { className: "panel-tabs", role: "tablist", "aria-label": "Planner panels", children: [_jsxs("button", { type: "button", className: panelTab === 'inspect' ? 'is-active' : '', onClick: () => setPanelTab('inspect'), children: [_jsx(PanelRight, { size: 16 }), "Inspect"] }), _jsxs("button", { type: "button", className: panelTab === 'json' ? 'is-active' : '', onClick: () => setPanelTab('json'), children: [_jsx(FileJson2, { size: 16 }), "JSON"] }), _jsxs("button", { type: "button", className: panelTab === 'issues' ? 'is-active' : '', onClick: () => setPanelTab('issues'), children: [_jsx(AlertTriangle, { size: 16 }), "Issues"] })] }), panelTab === 'inspect' ? (_jsx(Inspector, { selected: selected, schema: schema, selection: selection, setSelection: setSelection, updateSchema: updateSchema })) : null, panelTab === 'json' ? (_jsxs("div", { className: "json-panel", children: [_jsxs("div", { className: "panel-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "section-label", children: "Preview" }), _jsx("h2", { children: "Export JSON" })] }), _jsx("button", { type: "button", className: "icon-button", title: "Copy JSON", onClick: copyJson, children: _jsx(Clipboard, { size: 17 }) })] }), _jsx("pre", { children: jsonPreview })] })) : null, panelTab === 'issues' ? (_jsxs("div", { className: "issues-panel", children: [_jsx("div", { className: "panel-heading", children: _jsxs("div", { children: [_jsx("span", { className: "section-label", children: "Validation" }), _jsx("h2", { children: issues.length ? `${issues.length} issue${issues.length === 1 ? '' : 's'}` : 'Ready to export' })] }) }), issues.length ? (_jsx("div", { className: "issue-list", children: issues.map((issue) => (_jsxs("div", { className: `issue-item ${issue.severity}`, children: [_jsx(AlertTriangle, { size: 16 }), _jsx("span", { children: issue.message })] }, issue.id))) })) : (_jsxs("div", { className: "empty-state", children: [_jsx(CheckCircle2, { size: 28 }), _jsx("span", { children: "No errors or warnings right now." })] }))] })) : null] })] })] }));
}
function Inspector({ selected, schema, selection, setSelection, updateSchema, }) {
    if (selection.kind === 'canvas') {
        return (_jsxs("div", { className: "inspector empty-inspector", children: [_jsx("div", { className: "empty-graphic", children: _jsx(Network, { size: 34 }) }), _jsx("h2", { children: "Select something on the canvas" }), _jsx("p", { children: "Tables, fields, enums, notes, and relationship lines all have focused controls here." })] }));
    }
    if (selection.kind === 'table' && selected.kind === 'table') {
        return (_jsx(TableInspector, { table: selected.table, updateSchema: updateSchema, setSelection: setSelection }));
    }
    if (selection.kind === 'field' && selected.kind === 'field') {
        return (_jsx(FieldInspector, { table: selected.table, field: selected.field, enums: schema.enums, updateSchema: updateSchema, setSelection: setSelection }));
    }
    if (selection.kind === 'relation' && selected.kind === 'relation') {
        return (_jsx(RelationInspector, { relation: selected.relation, schema: schema, updateSchema: updateSchema, setSelection: setSelection }));
    }
    if (selection.kind === 'enum' && selected.kind === 'enum') {
        return (_jsx(EnumInspector, { schemaEnum: selected.schemaEnum, updateSchema: updateSchema, setSelection: setSelection }));
    }
    if (selection.kind === 'note' && selected.kind === 'note') {
        return (_jsx(NoteInspector, { note: selected.note, updateSchema: updateSchema, setSelection: setSelection }));
    }
    return (_jsxs("div", { className: "inspector empty-inspector", children: [_jsx(AlertTriangle, { size: 28 }), _jsx("h2", { children: "Selection moved" }), _jsx("p", { children: "The selected item no longer exists." })] }));
}
function TableInspector({ table, updateSchema, setSelection, }) {
    const addField = () => {
        const field = createField({ name: uniqueName('new_field', table.fields.map((item) => item.name)) });
        updateSchema((current) => ({
            ...current,
            tables: current.tables.map((candidate) => candidate.id === table.id ? { ...candidate, fields: [...candidate.fields, field] } : candidate),
        }));
        setSelection({ kind: 'field', tableId: table.id, fieldId: field.id });
    };
    const addIndex = () => {
        const firstField = table.fields[0]?.id;
        const index = createIndex(firstField ? [firstField] : []);
        updateSchema((current) => ({
            ...current,
            tables: current.tables.map((candidate) => candidate.id === table.id ? { ...candidate, indexes: [...candidate.indexes, index] } : candidate),
        }));
    };
    return (_jsxs("div", { className: "inspector", children: [_jsx(InspectorHeading, { icon: _jsx(Table2, { size: 20 }), eyebrow: "Table", title: table.name || 'Untitled table' }), _jsx(FieldLabel, { label: "Name", children: _jsx("input", { value: table.name, onChange: (event) => patchTable(updateSchema, table.id, { name: event.target.value }) }) }), _jsx(FieldLabel, { label: "Description", children: _jsx("textarea", { value: table.description, onChange: (event) => patchTable(updateSchema, table.id, { description: event.target.value }) }) }), _jsxs("div", { className: "inspector-row", children: [_jsx("h3", { children: "Fields" }), _jsxs("button", { type: "button", className: "small-button", onClick: addField, children: [_jsx(Plus, { size: 15 }), "Add"] })] }), _jsx("div", { className: "field-picker-list", children: table.fields.map((field) => (_jsxs("button", { type: "button", onClick: () => setSelection({ kind: 'field', tableId: table.id, fieldId: field.id }), children: [_jsx("span", { children: field.name || 'unnamed' }), _jsx("span", { style: { color: TYPE_COLORS[field.type] }, children: field.type })] }, field.id))) }), _jsxs("div", { className: "inspector-row", children: [_jsx("h3", { children: "Indexes" }), _jsxs("button", { type: "button", className: "small-button", onClick: addIndex, children: [_jsx(Plus, { size: 15 }), "Add"] })] }), _jsx("div", { className: "index-list", children: table.indexes.length ? table.indexes.map((index) => (_jsx(IndexEditor, { table: table, index: index, updateSchema: updateSchema }, index.id))) : _jsx("span", { className: "muted", children: "No indexes yet." }) }), _jsxs("button", { type: "button", className: "danger-button", onClick: () => deleteTable(updateSchema, table.id, setSelection), children: [_jsx(Trash2, { size: 16 }), "Delete table"] })] }));
}
function FieldInspector({ table, field, enums, updateSchema, setSelection, }) {
    const patchField = (patch) => patchTableField(updateSchema, table.id, field.id, patch);
    return (_jsxs("div", { className: "inspector", children: [_jsx(InspectorHeading, { icon: _jsx(CircleDot, { size: 20 }), eyebrow: table.name, title: field.name || 'Untitled field' }), _jsx(FieldLabel, { label: "Name", children: _jsx("input", { value: field.name, onChange: (event) => patchField({ name: event.target.value }) }) }), _jsx(FieldLabel, { label: "Type", children: _jsx("select", { value: field.type, onChange: (event) => {
                        const nextType = event.target.value;
                        patchField({
                            type: nextType,
                            enumId: nextType === 'enum' ? field.enumId || enums[0]?.id : undefined,
                        });
                    }, children: FIELD_TYPES.map((type) => (_jsx("option", { value: type, children: type }, type))) }) }), field.type === 'enum' ? (_jsx(FieldLabel, { label: "Enum", children: _jsxs("select", { value: field.enumId ?? '', onChange: (event) => patchField({ enumId: event.target.value || undefined }), children: [_jsx("option", { value: "", children: "Choose enum" }), enums.map((schemaEnum) => (_jsx("option", { value: schemaEnum.id, children: schemaEnum.name }, schemaEnum.id)))] }) })) : null, _jsxs("div", { className: "toggle-grid", children: [_jsx(Toggle, { label: "Required", checked: field.required, onChange: (checked) => patchField({ required: checked }) }), _jsx(Toggle, { label: "Unique", checked: field.unique, onChange: (checked) => patchField({ unique: checked }) }), _jsx(Toggle, { label: "Primary key", checked: field.primaryKey, onChange: (checked) => patchField({ primaryKey: checked, required: checked ? true : field.required, unique: checked ? true : field.unique }) })] }), _jsx(FieldLabel, { label: "Default", children: _jsx("input", { value: field.default, placeholder: "none", onChange: (event) => patchField({ default: event.target.value }) }) }), _jsx(FieldLabel, { label: "Description", children: _jsx("textarea", { value: field.description, onChange: (event) => patchField({ description: event.target.value }) }) }), _jsxs("button", { type: "button", className: "danger-button", onClick: () => deleteField(updateSchema, table.id, field.id, setSelection), children: [_jsx(Trash2, { size: 16 }), "Delete field"] })] }));
}
function RelationInspector({ relation, schema, updateSchema, setSelection, }) {
    const endpoints = describeRelationEndpoints(schema, relation);
    return (_jsxs("div", { className: "inspector", children: [_jsx(InspectorHeading, { icon: _jsx(Link2, { size: 20 }), eyebrow: "Relationship", title: relation.label || relation.id }), _jsxs("div", { className: "relationship-summary", children: [_jsx("span", { children: endpoints.from }), _jsx(Link2, { size: 16 }), _jsx("span", { children: endpoints.to })] }), _jsx(FieldLabel, { label: "Label", children: _jsx("input", { value: relation.label, onChange: (event) => patchRelation(updateSchema, relation.id, { label: event.target.value }) }) }), _jsx(FieldLabel, { label: "Cardinality", children: _jsx("select", { value: relation.cardinality, onChange: (event) => patchRelation(updateSchema, relation.id, { cardinality: event.target.value }), children: CARDINALITIES.map((cardinality) => (_jsx("option", { value: cardinality, children: cardinality }, cardinality))) }) }), _jsx(FieldLabel, { label: "On delete", children: _jsx("select", { value: relation.onDelete, onChange: (event) => patchRelation(updateSchema, relation.id, { onDelete: event.target.value }), children: DELETE_ACTIONS.map((action) => (_jsx("option", { value: action, children: action }, action))) }) }), _jsxs("button", { type: "button", className: "danger-button", onClick: () => deleteRelation(updateSchema, relation.id, setSelection), children: [_jsx(Trash2, { size: 16 }), "Delete relationship"] })] }));
}
function EnumInspector({ schemaEnum, updateSchema, setSelection, }) {
    return (_jsxs("div", { className: "inspector", children: [_jsx(InspectorHeading, { icon: _jsx(ListChecks, { size: 20 }), eyebrow: "Enum", title: schemaEnum.name || 'Untitled enum' }), _jsx(FieldLabel, { label: "Name", children: _jsx("input", { value: schemaEnum.name, onChange: (event) => patchEnum(updateSchema, schemaEnum.id, { name: event.target.value }) }) }), _jsx(FieldLabel, { label: "Values", children: _jsx("textarea", { className: "tall-textarea", value: schemaEnum.values.join('\n'), onChange: (event) => patchEnum(updateSchema, schemaEnum.id, {
                        values: event.target.value
                            .split('\n')
                            .map((value) => value.trim())
                            .filter(Boolean),
                    }) }) }), _jsxs("button", { type: "button", className: "danger-button", onClick: () => deleteEnum(updateSchema, schemaEnum.id, setSelection), children: [_jsx(Trash2, { size: 16 }), "Delete enum"] })] }));
}
function NoteInspector({ note, updateSchema, setSelection, }) {
    return (_jsxs("div", { className: "inspector", children: [_jsx(InspectorHeading, { icon: _jsx(Braces, { size: 20 }), eyebrow: "Note", title: note.title || 'Untitled note' }), _jsx(FieldLabel, { label: "Title", children: _jsx("input", { value: note.title, onChange: (event) => patchNote(updateSchema, note.id, { title: event.target.value }) }) }), _jsx(FieldLabel, { label: "Body", children: _jsx("textarea", { className: "tall-textarea", value: note.body, onChange: (event) => patchNote(updateSchema, note.id, { body: event.target.value }) }) }), _jsxs("button", { type: "button", className: "danger-button", onClick: () => deleteNote(updateSchema, note.id, setSelection), children: [_jsx(Trash2, { size: 16 }), "Delete note"] })] }));
}
function IndexEditor({ table, index, updateSchema, }) {
    const selectedFields = new Set(index.fields);
    return (_jsxs("div", { className: "index-editor", children: [_jsx("input", { value: index.name, "aria-label": "Index name", onChange: (event) => patchTableIndex(updateSchema, table.id, index.id, { name: event.target.value }) }), _jsx(Toggle, { label: "Unique", checked: index.unique, onChange: (checked) => patchTableIndex(updateSchema, table.id, index.id, { unique: checked }) }), _jsx("div", { className: "index-field-grid", children: table.fields.map((field) => (_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: selectedFields.has(field.id), onChange: (event) => {
                                const nextFields = event.target.checked
                                    ? [...index.fields, field.id]
                                    : index.fields.filter((fieldId) => fieldId !== field.id);
                                patchTableIndex(updateSchema, table.id, index.id, { fields: nextFields });
                            } }), field.name] }, field.id))) }), _jsx("button", { type: "button", className: "link-danger", onClick: () => deleteIndex(updateSchema, table.id, index.id), children: "Remove index" })] }));
}
function InspectorHeading({ icon, eyebrow, title }) {
    return (_jsxs("div", { className: "inspector-heading", children: [_jsx("div", { className: "inspector-icon", children: icon }), _jsxs("div", { children: [_jsx("span", { className: "section-label", children: eyebrow }), _jsx("h2", { children: title })] })] }));
}
function FieldLabel({ label, children }) {
    return (_jsxs("label", { className: "field-label", children: [_jsx("span", { children: label }), children] }));
}
function Toggle({ label, checked, onChange }) {
    return (_jsxs("label", { className: "toggle-control", children: [_jsx("input", { type: "checkbox", checked: checked, onChange: (event) => onChange(event.target.checked) }), _jsx("span", { children: label })] }));
}
function useSelectedEntity(schema, selection) {
    if (selection.kind === 'table') {
        const table = schema.tables.find((candidate) => candidate.id === selection.tableId);
        return table ? { kind: 'table', table } : { kind: 'canvas' };
    }
    if (selection.kind === 'field') {
        const table = schema.tables.find((candidate) => candidate.id === selection.tableId);
        const field = table?.fields.find((candidate) => candidate.id === selection.fieldId);
        return table && field ? { kind: 'field', table, field } : { kind: 'canvas' };
    }
    if (selection.kind === 'relation') {
        const relation = schema.relations.find((candidate) => candidate.id === selection.relationId);
        return relation ? { kind: 'relation', relation } : { kind: 'canvas' };
    }
    if (selection.kind === 'enum') {
        const schemaEnum = schema.enums.find((candidate) => candidate.id === selection.enumId);
        return schemaEnum ? { kind: 'enum', schemaEnum } : { kind: 'canvas' };
    }
    if (selection.kind === 'note') {
        const note = schema.notes.find((candidate) => candidate.id === selection.noteId);
        return note ? { kind: 'note', note } : { kind: 'canvas' };
    }
    return { kind: 'canvas' };
}
function usePersistentSchema() {
    const [schema, setSchema] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? normalizeSchema(JSON.parse(stored)) : createTemplateSchema('content');
        }
        catch {
            return createTemplateSchema('content');
        }
    });
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    }, [schema]);
    return [schema, setSchema];
}
function patchTable(updateSchema, tableId, patch) {
    updateSchema((current) => ({
        ...current,
        tables: current.tables.map((table) => (table.id === tableId ? { ...table, ...patch } : table)),
    }));
}
function patchTableField(updateSchema, tableId, fieldId, patch) {
    updateSchema((current) => ({
        ...current,
        tables: current.tables.map((table) => table.id === tableId
            ? {
                ...table,
                fields: table.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
            }
            : table),
    }));
}
function patchTableIndex(updateSchema, tableId, indexId, patch) {
    updateSchema((current) => ({
        ...current,
        tables: current.tables.map((table) => table.id === tableId
            ? {
                ...table,
                indexes: table.indexes.map((index) => (index.id === indexId ? { ...index, ...patch } : index)),
            }
            : table),
    }));
}
function patchRelation(updateSchema, relationId, patch) {
    updateSchema((current) => ({
        ...current,
        relations: current.relations.map((relation) => (relation.id === relationId ? { ...relation, ...patch } : relation)),
    }));
}
function patchEnum(updateSchema, enumId, patch) {
    updateSchema((current) => ({
        ...current,
        enums: current.enums.map((schemaEnum) => (schemaEnum.id === enumId ? { ...schemaEnum, ...patch } : schemaEnum)),
    }));
}
function patchNote(updateSchema, noteId, patch) {
    updateSchema((current) => ({
        ...current,
        notes: current.notes.map((note) => (note.id === noteId ? { ...note, ...patch } : note)),
    }));
}
function deleteTable(updateSchema, tableId, setSelection) {
    updateSchema((current) => ({
        ...current,
        tables: current.tables.filter((table) => table.id !== tableId),
        relations: current.relations.filter((relation) => relation.from.tableId !== tableId && relation.to.tableId !== tableId),
    }));
    setSelection({ kind: 'canvas' });
}
function deleteField(updateSchema, tableId, fieldId, setSelection) {
    updateSchema((current) => ({
        ...current,
        tables: current.tables.map((table) => table.id === tableId
            ? {
                ...table,
                fields: table.fields.filter((field) => field.id !== fieldId),
                indexes: table.indexes
                    .map((index) => ({ ...index, fields: index.fields.filter((candidate) => candidate !== fieldId) }))
                    .filter((index) => index.fields.length > 0),
            }
            : table),
        relations: current.relations.filter((relation) => relation.from.fieldId !== fieldId && relation.to.fieldId !== fieldId),
    }));
    setSelection({ kind: 'table', tableId });
}
function deleteRelation(updateSchema, relationId, setSelection) {
    updateSchema((current) => ({
        ...current,
        relations: current.relations.filter((relation) => relation.id !== relationId),
    }));
    setSelection({ kind: 'canvas' });
}
function deleteEnum(updateSchema, enumId, setSelection) {
    updateSchema((current) => ({
        ...current,
        tables: current.tables.map((table) => ({
            ...table,
            fields: table.fields.map((field) => (field.enumId === enumId ? { ...field, enumId: undefined } : field)),
        })),
        enums: current.enums.filter((schemaEnum) => schemaEnum.id !== enumId),
    }));
    setSelection({ kind: 'canvas' });
}
function deleteNote(updateSchema, noteId, setSelection) {
    updateSchema((current) => ({
        ...current,
        notes: current.notes.filter((note) => note.id !== noteId),
    }));
    setSelection({ kind: 'canvas' });
}
function deleteIndex(updateSchema, tableId, indexId) {
    updateSchema((current) => ({
        ...current,
        tables: current.tables.map((table) => table.id === tableId ? { ...table, indexes: table.indexes.filter((index) => index.id !== indexId) } : table),
    }));
}
function describeRelationEndpoints(schema, relation) {
    const fromTable = schema.tables.find((table) => table.id === relation.from.tableId);
    const toTable = schema.tables.find((table) => table.id === relation.to.tableId);
    const fromField = fromTable?.fields.find((field) => field.id === relation.from.fieldId);
    const toField = toTable?.fields.find((field) => field.id === relation.to.fieldId);
    return {
        from: `${fromTable?.name ?? 'missing'}.${fromField?.name ?? 'missing'}`,
        to: `${toTable?.name ?? 'missing'}.${toField?.name ?? 'missing'}`,
    };
}
function getIssueCounts(issues) {
    return {
        errors: issues.filter((issue) => issue.severity === 'error').length,
        warnings: issues.filter((issue) => issue.severity === 'warning').length,
    };
}
function uniqueName(base, existing) {
    const used = new Set(existing.map((name) => name.toLowerCase()));
    if (!used.has(base.toLowerCase())) {
        return base;
    }
    let index = 2;
    while (used.has(`${base}_${index}`.toLowerCase())) {
        index += 1;
    }
    return `${base}_${index}`;
}
function slugify(value) {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'schema';
}
