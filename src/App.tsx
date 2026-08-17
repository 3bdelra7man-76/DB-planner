import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  type Connection,
  ConnectionMode,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  CircleDot,
  Clipboard,
  Download,
  FileJson2,
  Grid3X3,
  KeyRound,
  Link2,
  ListChecks,
  Network,
  PanelRight,
  Plus,
  Rows3,
  Sparkles,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CARDINALITIES,
  DELETE_ACTIONS,
  FIELD_TYPES,
  TYPE_COLORS,
  createBlankSchema,
  createEnum,
  createField,
  createId,
  createIndex,
  createNote,
  createTable,
  createTemplateSchema,
  normalizeSchema,
  parseFieldHandle,
  sourceHandleId,
  targetHandleId,
  touchSchema,
  validateSchema,
} from './schema';
import type {
  DeleteAction,
  FieldType,
  RelationCardinality,
  SchemaDocument,
  SchemaEnum,
  SchemaField,
  SchemaIndex,
  SchemaNote,
  SchemaRelation,
  SchemaTable,
  Selection,
  ValidationIssue,
  XYPosition,
} from './types';

const STORAGE_KEY = 'db-schema-planner:draft:v1';

type PanelTab = 'inspect' | 'json' | 'issues';

type TableNodeData = Record<string, unknown> & {
  table: SchemaTable;
  selectedFieldId?: string;
  issues: ValidationIssue[];
  onSelectField: (tableId: string, fieldId: string) => void;
};

type EnumNodeData = Record<string, unknown> & {
  schemaEnum: SchemaEnum;
};

type NoteNodeData = Record<string, unknown> & {
  note: SchemaNote;
};

type TableFlowNode = Node<TableNodeData, 'tableNode'>;
type EnumFlowNode = Node<EnumNodeData, 'enumNode'>;
type NoteFlowNode = Node<NoteNodeData, 'noteNode'>;
type PlannerNode = TableFlowNode | EnumFlowNode | NoteFlowNode;

function TableNode({ data, selected }: NodeProps<TableFlowNode>) {
  const table = data.table;
  const issueCount = data.issues.length;

  return (
    <div className={`schema-node table-node ${selected ? 'is-selected' : ''}`}>
      <div className="node-accent" />
      <div className="node-header">
        <div className="node-icon node-icon-table">
          <Table2 size={18} />
        </div>
        <div className="node-title-wrap">
          <strong className="node-title">{table.name || 'untitled_table'}</strong>
          <span>{table.fields.length} fields</span>
        </div>
        {issueCount > 0 ? (
          <span className="node-alert" title={`${issueCount} validation warning(s)`}>
            <AlertTriangle size={14} />
            {issueCount}
          </span>
        ) : (
          <span className="node-clean" title="No validation issues">
            <CheckCircle2 size={14} />
          </span>
        )}
      </div>

      <div className="field-list">
        {table.fields.map((field) => (
          <div
            key={field.id}
            className={`field-row nodrag nopan ${data.selectedFieldId === field.id ? 'is-active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              data.onSelectField(table.id, field.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                data.onSelectField(table.id, field.id);
              }
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={targetHandleId(field.id)}
              className="field-handle field-handle-left"
              title={`Link to ${table.name}.${field.name}`}
              aria-label={`Link to ${table.name}.${field.name}`}
            />
            <span className="field-name">
              {field.primaryKey ? <KeyRound size={12} /> : field.type === 'relation' ? <Link2 size={12} /> : <CircleDot size={10} />}
              {field.name || 'unnamed'}
            </span>
            <span className="field-flags">
              {field.required ? <span title="Required">NN</span> : null}
              {field.unique ? <span title="Unique">UQ</span> : null}
            </span>
            <span className="type-pill" style={{ '--type-color': TYPE_COLORS[field.type] } as CSSProperties}>
              {field.type}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={sourceHandleId(field.id)}
              className="field-handle field-handle-right"
              title={`Link from ${table.name}.${field.name}`}
              aria-label={`Link from ${table.name}.${field.name}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function EnumNode({ data, selected }: NodeProps<EnumFlowNode>) {
  return (
    <div className={`schema-node enum-node ${selected ? 'is-selected' : ''}`}>
      <div className="node-accent enum-accent" />
      <div className="node-header">
        <div className="node-icon node-icon-enum">
          <ListChecks size={18} />
        </div>
        <div className="node-title-wrap">
          <strong className="node-title">{data.schemaEnum.name || 'unnamed_enum'}</strong>
          <span>{data.schemaEnum.values.length} values</span>
        </div>
      </div>
      <div className="enum-values">
        {data.schemaEnum.values.slice(0, 6).map((value) => (
          <span key={value}>{value}</span>
        ))}
        {data.schemaEnum.values.length > 6 ? <span>+{data.schemaEnum.values.length - 6}</span> : null}
      </div>
    </div>
  );
}

function NoteNode({ data, selected }: NodeProps<NoteFlowNode>) {
  return (
    <div className={`schema-node note-node ${selected ? 'is-selected' : ''}`}>
      <div className="node-accent note-accent" />
      <div className="node-header">
        <div className="node-icon node-icon-note">
          <Braces size={18} />
        </div>
        <div className="node-title-wrap">
          <strong className="node-title">{data.note.title || 'Note'}</strong>
          <span>schema context</span>
        </div>
      </div>
      <p>{data.note.body}</p>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
  enumNode: EnumNode,
  noteNode: NoteNode,
};

function buildPlannerNodes(
  schema: SchemaDocument,
  issues: ValidationIssue[],
  selection: Selection,
  selectField: (tableId: string, fieldId: string) => void,
  previousNodes: PlannerNode[] = [],
): PlannerNode[] {
  const previousById = new Map(previousNodes.map((node) => [node.id, node]));

  const tableNodes: TableFlowNode[] = schema.tables.map((table) => {
    const previous = previousById.get(table.id);
    const fallbackSize = estimateTableNodeSize(table);

    return {
      ...previous,
      id: table.id,
      type: 'tableNode',
      position: table.position,
      initialWidth: fallbackSize.width,
      initialHeight: fallbackSize.height,
      measured: measuredOrFallback(previous, fallbackSize),
      data: {
        table,
        selectedFieldId: selection.kind === 'field' && selection.tableId === table.id ? selection.fieldId : undefined,
        issues: issues.filter((issue) => issue.id.includes(table.id) || issue.message.includes(table.name)),
        onSelectField: selectField,
      },
    };
  });

  const enumNodes: EnumFlowNode[] = schema.enums.map((schemaEnum) => {
    const previous = previousById.get(schemaEnum.id);
    const fallbackSize = estimateEnumNodeSize(schemaEnum);

    return {
      ...previous,
      id: schemaEnum.id,
      type: 'enumNode',
      position: schemaEnum.position,
      initialWidth: fallbackSize.width,
      initialHeight: fallbackSize.height,
      measured: measuredOrFallback(previous, fallbackSize),
      data: { schemaEnum },
    };
  });

  const noteNodes: NoteFlowNode[] = schema.notes.map((note) => {
    const previous = previousById.get(note.id);
    const fallbackSize = estimateNoteNodeSize(note);

    return {
      ...previous,
      id: note.id,
      type: 'noteNode',
      position: note.position,
      initialWidth: fallbackSize.width,
      initialHeight: fallbackSize.height,
      measured: measuredOrFallback(previous, fallbackSize),
      data: { note },
    };
  });

  return [...tableNodes, ...enumNodes, ...noteNodes];
}

function estimateTableNodeSize(table: SchemaTable) {
  return {
    width: 318,
    height: 68 + Math.max(table.fields.length, 1) * 38,
  };
}

function estimateEnumNodeSize(schemaEnum: SchemaEnum) {
  return {
    width: 318,
    height: 82 + Math.ceil(Math.max(schemaEnum.values.length, 1) / 3) * 32,
  };
}

function estimateNoteNodeSize(note: SchemaNote) {
  return {
    width: 318,
    height: 112 + Math.ceil(note.body.length / 48) * 20,
  };
}

function measuredOrFallback(node: PlannerNode | undefined, fallback: { width: number; height: number }) {
  return {
    width: node?.measured?.width ?? fallback.width,
    height: node?.measured?.height ?? fallback.height,
  };
}

export default function App() {
  return (
    <ReactFlowProvider>
      <PlannerApp />
    </ReactFlowProvider>
  );
}

function PlannerApp() {
  const [schema, setSchema] = usePersistentSchema();
  const [selection, setSelection] = useState<Selection>({ kind: 'canvas' });
  const [panelTab, setPanelTab] = useState<PanelTab>('inspect');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const issues = useMemo(() => validateSchema(schema), [schema]);
  const jsonPreview = useMemo(() => JSON.stringify(schema, null, 2), [schema]);

  const updateSchema = useCallback((updater: (current: SchemaDocument) => SchemaDocument) => {
    setSchema((current) => touchSchema(updater(current)));
  }, [setSchema]);

  const selectField = useCallback((tableId: string, fieldId: string) => {
    setSelection({ kind: 'field', tableId, fieldId });
    setPanelTab('inspect');
  }, []);

  const [nodes, setNodes] = useState<PlannerNode[]>(() => buildPlannerNodes(schema, issues, selection, selectField));

  useEffect(() => {
    setNodes((current) => buildPlannerNodes(schema, issues, selection, selectField, current));
  }, [issues, schema, selectField, selection]);

  const edges = useMemo<Edge[]>(() => {
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

  const onNodesChange = useCallback((changes: NodeChange<PlannerNode>[]) => {
    const safeChanges = changes.filter((change) => change.type !== 'remove');

    if (!safeChanges.length) {
      return;
    }

    setNodes((current) => applyNodeChanges(safeChanges, current));
  }, []);

  const persistNodePosition = useCallback((nodeId: string, position: XYPosition) => {
    updateSchema((current) => {
      return {
        ...current,
        tables: current.tables.map((table) => ({
          ...table,
          position: table.id === nodeId ? position : table.position,
        })),
        enums: current.enums.map((schemaEnum) => ({
          ...schemaEnum,
          position: schemaEnum.id === nodeId ? position : schemaEnum.position,
        })),
        notes: current.notes.map((note) => ({
          ...note,
          position: note.id === nodeId ? position : note.position,
        })),
      };
    });
  }, [updateSchema]);

  const onConnect = useCallback((connection: Connection) => {
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
      const duplicate = current.relations.some(
        (relation) =>
          relation.from.tableId === connection.source &&
          relation.from.fieldId === sourceFieldId &&
          relation.to.tableId === connection.target &&
          relation.to.fieldId === targetFieldId,
      );

      if (duplicate) {
        setNotice('That relationship already exists.');
        return current;
      }

      const fromTable = current.tables.find((table) => table.id === connection.source);
      const toTable = current.tables.find((table) => table.id === connection.target);
      const fromField = fromTable?.fields.find((field) => field.id === sourceFieldId);
      const toField = toTable?.fields.find((field) => field.id === targetFieldId);

      const relation: SchemaRelation = {
        id: createId('rel'),
        from: { tableId: connection.source, fieldId: sourceFieldId },
        to: { tableId: connection.target, fieldId: targetFieldId },
        cardinality: 'many-to-one',
        onDelete: 'restrict',
        label: fromField && toField ? `${fromField.name} -> ${toField.name}` : 'relationship',
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

  const replaceSchema = useCallback((nextSchema: SchemaDocument) => {
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
      } else {
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
    } catch {
      setNotice('Clipboard blocked by the browser.');
    }
  }, [schema]);

  const importJson = useCallback((file: File) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const normalized = normalizeSchema(parsed);
        replaceSchema(normalized);
        setNotice(`Imported ${file.name}`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Import failed.');
      }
    };

    reader.readAsText(file);
  }, [replaceSchema]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">
            <Network size={22} />
          </div>
          <div>
            <span>DB Schema Planner</span>
            <input
              value={schema.project.name}
              aria-label="Project name"
              onChange={(event) =>
                updateSchema((current) => ({
                  ...current,
                  project: { ...current.project, name: event.target.value },
                }))
              }
            />
          </div>
        </div>

        <div className="toolbar-actions">
          <button type="button" className="ghost-button" title="Start blank schema" onClick={() => replaceSchema(createBlankSchema())}>
            <FileJson2 size={17} />
            Blank
          </button>
          <button type="button" className="ghost-button" title="Import JSON" onClick={() => fileInputRef.current?.click()}>
            <Upload size={17} />
            Import
          </button>
          <button type="button" className="ghost-button" title="Copy JSON" onClick={copyJson}>
            <Clipboard size={17} />
            Copy
          </button>
          <button type="button" className="primary-button" title="Export JSON" onClick={exportJson}>
            <Download size={17} />
            Export JSON
          </button>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                importJson(file);
              }
              event.target.value = '';
            }}
          />
        </div>
      </header>

      <main className="planner-layout">
        <aside className="left-rail">
          <div className="rail-section">
            <span className="section-label">Create</span>
            <button type="button" className="tool-button" onClick={addTable}>
              <Table2 size={18} />
              Table
            </button>
            <button type="button" className="tool-button" onClick={addEnumNode}>
              <ListChecks size={18} />
              Enum
            </button>
            <button type="button" className="tool-button" onClick={addNoteNode}>
              <Braces size={18} />
              Note
            </button>
          </div>

          <div className="rail-section">
            <span className="section-label">Templates</span>
            <button type="button" className="template-button" onClick={() => replaceSchema(createTemplateSchema('auth'))}>
              <Sparkles size={16} />
              Auth
            </button>
            <button type="button" className="template-button" onClick={() => replaceSchema(createTemplateSchema('commerce'))}>
              <Grid3X3 size={16} />
              Shop
            </button>
            <button type="button" className="template-button" onClick={() => replaceSchema(createTemplateSchema('content'))}>
              <Rows3 size={16} />
              CMS
            </button>
          </div>

          <div className="schema-health">
            <span className="section-label">Health</span>
            <div className="health-ring">
              <span>{issueCounts.errors}</span>
              <small>errors</small>
            </div>
            <div className="health-grid">
              <span>
                <strong>{schema.tables.length}</strong>
                tables
              </span>
              <span>
                <strong>{schema.relations.length}</strong>
                links
              </span>
              <span>
                <strong>{issueCounts.warnings}</strong>
                warnings
              </span>
            </div>
          </div>
        </aside>

        <section className="canvas-panel">
          {notice ? <div className="toast">{notice}</div> : null}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onNodeDragStop={(_, node) => persistNodePosition(node.id, node.position)}
            onNodeClick={(_, node) => {
              if (node.type === 'tableNode') {
                setSelection({ kind: 'table', tableId: node.id });
              } else if (node.type === 'enumNode') {
                setSelection({ kind: 'enum', enumId: node.id });
              } else if (node.type === 'noteNode') {
                setSelection({ kind: 'note', noteId: node.id });
              }
              setPanelTab('inspect');
            }}
            onPaneClick={() => setSelection({ kind: 'canvas' })}
            onEdgeClick={(_, edge) => {
              setSelection({ kind: 'relation', relationId: edge.id });
              setPanelTab('inspect');
            }}
            defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
            minZoom={0.3}
            maxZoom={1.7}
            connectOnClick={false}
            connectionMode={ConnectionMode.Loose}
            deleteKeyCode={null}
            nodeDragThreshold={4}
          >
            <Background color="#d9d0bd" gap={22} size={1.2} />
            <MiniMap
              pannable
              zoomable
              nodeBorderRadius={8}
              nodeStrokeWidth={2}
              nodeColor={(node) => {
                if (node.type === 'enumNode') return '#e2b844';
                if (node.type === 'noteNode') return '#e8795d';
                return '#5bb7a8';
              }}
            />
            <Controls position="bottom-left" showInteractive={false} />
          </ReactFlow>
        </section>

        <aside className="right-panel">
          <div className="panel-tabs" role="tablist" aria-label="Planner panels">
            <button type="button" className={panelTab === 'inspect' ? 'is-active' : ''} onClick={() => setPanelTab('inspect')}>
              <PanelRight size={16} />
              Inspect
            </button>
            <button type="button" className={panelTab === 'json' ? 'is-active' : ''} onClick={() => setPanelTab('json')}>
              <FileJson2 size={16} />
              JSON
            </button>
            <button type="button" className={panelTab === 'issues' ? 'is-active' : ''} onClick={() => setPanelTab('issues')}>
              <AlertTriangle size={16} />
              Issues
            </button>
          </div>

          {panelTab === 'inspect' ? (
            <Inspector
              selected={selected}
              schema={schema}
              selection={selection}
              setSelection={setSelection}
              updateSchema={updateSchema}
            />
          ) : null}

          {panelTab === 'json' ? (
            <div className="json-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-label">Preview</span>
                  <h2>Export JSON</h2>
                </div>
                <button type="button" className="icon-button" title="Copy JSON" onClick={copyJson}>
                  <Clipboard size={17} />
                </button>
              </div>
              <pre>{jsonPreview}</pre>
            </div>
          ) : null}

          {panelTab === 'issues' ? (
            <div className="issues-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-label">Validation</span>
                  <h2>{issues.length ? `${issues.length} issue${issues.length === 1 ? '' : 's'}` : 'Ready to export'}</h2>
                </div>
              </div>
              {issues.length ? (
                <div className="issue-list">
                  {issues.map((issue) => (
                    <div key={issue.id} className={`issue-item ${issue.severity}`}>
                      <AlertTriangle size={16} />
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <CheckCircle2 size={28} />
                  <span>No errors or warnings right now.</span>
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

function Inspector({
  selected,
  schema,
  selection,
  setSelection,
  updateSchema,
}: {
  selected: SelectedEntity;
  schema: SchemaDocument;
  selection: Selection;
  setSelection: (selection: Selection) => void;
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void;
}) {
  if (selection.kind === 'canvas') {
    return (
      <div className="inspector empty-inspector">
        <div className="empty-graphic">
          <Network size={34} />
        </div>
        <h2>Select something on the canvas</h2>
        <p>Tables, fields, enums, notes, and relationship lines all have focused controls here.</p>
      </div>
    );
  }

  if (selection.kind === 'table' && selected.kind === 'table') {
    return (
      <TableInspector
        table={selected.table}
        updateSchema={updateSchema}
        setSelection={setSelection}
      />
    );
  }

  if (selection.kind === 'field' && selected.kind === 'field') {
    return (
      <FieldInspector
        table={selected.table}
        field={selected.field}
        enums={schema.enums}
        updateSchema={updateSchema}
        setSelection={setSelection}
      />
    );
  }

  if (selection.kind === 'relation' && selected.kind === 'relation') {
    return (
      <RelationInspector
        relation={selected.relation}
        schema={schema}
        updateSchema={updateSchema}
        setSelection={setSelection}
      />
    );
  }

  if (selection.kind === 'enum' && selected.kind === 'enum') {
    return (
      <EnumInspector
        schemaEnum={selected.schemaEnum}
        updateSchema={updateSchema}
        setSelection={setSelection}
      />
    );
  }

  if (selection.kind === 'note' && selected.kind === 'note') {
    return (
      <NoteInspector
        note={selected.note}
        updateSchema={updateSchema}
        setSelection={setSelection}
      />
    );
  }

  return (
    <div className="inspector empty-inspector">
      <AlertTriangle size={28} />
      <h2>Selection moved</h2>
      <p>The selected item no longer exists.</p>
    </div>
  );
}

function TableInspector({
  table,
  updateSchema,
  setSelection,
}: {
  table: SchemaTable;
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void;
  setSelection: (selection: Selection) => void;
}) {
  const addField = () => {
    const field = createField({ name: uniqueName('new_field', table.fields.map((item) => item.name)) });

    updateSchema((current) => ({
      ...current,
      tables: current.tables.map((candidate) =>
        candidate.id === table.id ? { ...candidate, fields: [...candidate.fields, field] } : candidate,
      ),
    }));
    setSelection({ kind: 'field', tableId: table.id, fieldId: field.id });
  };

  const addIndex = () => {
    const firstField = table.fields[0]?.id;
    const index = createIndex(firstField ? [firstField] : []);

    updateSchema((current) => ({
      ...current,
      tables: current.tables.map((candidate) =>
        candidate.id === table.id ? { ...candidate, indexes: [...candidate.indexes, index] } : candidate,
      ),
    }));
  };

  return (
    <div className="inspector">
      <InspectorHeading icon={<Table2 size={20} />} eyebrow="Table" title={table.name || 'Untitled table'} />
      <FieldLabel label="Name">
        <input value={table.name} onChange={(event) => patchTable(updateSchema, table.id, { name: event.target.value })} />
      </FieldLabel>
      <FieldLabel label="Description">
        <textarea value={table.description} onChange={(event) => patchTable(updateSchema, table.id, { description: event.target.value })} />
      </FieldLabel>

      <div className="inspector-row">
        <h3>Fields</h3>
        <button type="button" className="small-button" onClick={addField}>
          <Plus size={15} />
          Add
        </button>
      </div>

      <div className="field-picker-list">
        {table.fields.map((field) => (
          <button key={field.id} type="button" onClick={() => setSelection({ kind: 'field', tableId: table.id, fieldId: field.id })}>
            <span>{field.name || 'unnamed'}</span>
            <span style={{ color: TYPE_COLORS[field.type] }}>{field.type}</span>
          </button>
        ))}
      </div>

      <div className="inspector-row">
        <h3>Indexes</h3>
        <button type="button" className="small-button" onClick={addIndex}>
          <Plus size={15} />
          Add
        </button>
      </div>
      <div className="index-list">
        {table.indexes.length ? table.indexes.map((index) => (
          <IndexEditor key={index.id} table={table} index={index} updateSchema={updateSchema} />
        )) : <span className="muted">No indexes yet.</span>}
      </div>

      <button type="button" className="danger-button" onClick={() => deleteTable(updateSchema, table.id, setSelection)}>
        <Trash2 size={16} />
        Delete table
      </button>
    </div>
  );
}

function FieldInspector({
  table,
  field,
  enums,
  updateSchema,
  setSelection,
}: {
  table: SchemaTable;
  field: SchemaField;
  enums: SchemaEnum[];
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void;
  setSelection: (selection: Selection) => void;
}) {
  const patchField = (patch: Partial<SchemaField>) => patchTableField(updateSchema, table.id, field.id, patch);

  return (
    <div className="inspector">
      <InspectorHeading icon={<CircleDot size={20} />} eyebrow={table.name} title={field.name || 'Untitled field'} />
      <FieldLabel label="Name">
        <input value={field.name} onChange={(event) => patchField({ name: event.target.value })} />
      </FieldLabel>
      <FieldLabel label="Type">
        <select
          value={field.type}
          onChange={(event) => {
            const nextType = event.target.value as FieldType;
            patchField({
              type: nextType,
              enumId: nextType === 'enum' ? field.enumId || enums[0]?.id : undefined,
            });
          }}
        >
          {FIELD_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </FieldLabel>
      {field.type === 'enum' ? (
        <FieldLabel label="Enum">
          <select value={field.enumId ?? ''} onChange={(event) => patchField({ enumId: event.target.value || undefined })}>
            <option value="">Choose enum</option>
            {enums.map((schemaEnum) => (
              <option key={schemaEnum.id} value={schemaEnum.id}>
                {schemaEnum.name}
              </option>
            ))}
          </select>
        </FieldLabel>
      ) : null}
      <div className="toggle-grid">
        <Toggle label="Required" checked={field.required} onChange={(checked) => patchField({ required: checked })} />
        <Toggle label="Unique" checked={field.unique} onChange={(checked) => patchField({ unique: checked })} />
        <Toggle
          label="Primary key"
          checked={field.primaryKey}
          onChange={(checked) => patchField({ primaryKey: checked, required: checked ? true : field.required, unique: checked ? true : field.unique })}
        />
      </div>
      <FieldLabel label="Default">
        <input value={field.default} placeholder="none" onChange={(event) => patchField({ default: event.target.value })} />
      </FieldLabel>
      <FieldLabel label="Description">
        <textarea value={field.description} onChange={(event) => patchField({ description: event.target.value })} />
      </FieldLabel>
      <button type="button" className="danger-button" onClick={() => deleteField(updateSchema, table.id, field.id, setSelection)}>
        <Trash2 size={16} />
        Delete field
      </button>
    </div>
  );
}

function RelationInspector({
  relation,
  schema,
  updateSchema,
  setSelection,
}: {
  relation: SchemaRelation;
  schema: SchemaDocument;
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void;
  setSelection: (selection: Selection) => void;
}) {
  const endpoints = describeRelationEndpoints(schema, relation);

  return (
    <div className="inspector">
      <InspectorHeading icon={<Link2 size={20} />} eyebrow="Relationship" title={relation.label || relation.id} />
      <div className="relationship-summary">
        <span>{endpoints.from}</span>
        <Link2 size={16} />
        <span>{endpoints.to}</span>
      </div>
      <FieldLabel label="Label">
        <input value={relation.label} onChange={(event) => patchRelation(updateSchema, relation.id, { label: event.target.value })} />
      </FieldLabel>
      <FieldLabel label="Cardinality">
        <select
          value={relation.cardinality}
          onChange={(event) => patchRelation(updateSchema, relation.id, { cardinality: event.target.value as RelationCardinality })}
        >
          {CARDINALITIES.map((cardinality) => (
            <option key={cardinality} value={cardinality}>
              {cardinality}
            </option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label="On delete">
        <select
          value={relation.onDelete}
          onChange={(event) => patchRelation(updateSchema, relation.id, { onDelete: event.target.value as DeleteAction })}
        >
          {DELETE_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </FieldLabel>
      <button type="button" className="danger-button" onClick={() => deleteRelation(updateSchema, relation.id, setSelection)}>
        <Trash2 size={16} />
        Delete relationship
      </button>
    </div>
  );
}

function EnumInspector({
  schemaEnum,
  updateSchema,
  setSelection,
}: {
  schemaEnum: SchemaEnum;
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void;
  setSelection: (selection: Selection) => void;
}) {
  return (
    <div className="inspector">
      <InspectorHeading icon={<ListChecks size={20} />} eyebrow="Enum" title={schemaEnum.name || 'Untitled enum'} />
      <FieldLabel label="Name">
        <input value={schemaEnum.name} onChange={(event) => patchEnum(updateSchema, schemaEnum.id, { name: event.target.value })} />
      </FieldLabel>
      <FieldLabel label="Values">
        <textarea
          className="tall-textarea"
          value={schemaEnum.values.join('\n')}
          onChange={(event) =>
            patchEnum(updateSchema, schemaEnum.id, {
              values: event.target.value
                .split('\n')
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
        />
      </FieldLabel>
      <button type="button" className="danger-button" onClick={() => deleteEnum(updateSchema, schemaEnum.id, setSelection)}>
        <Trash2 size={16} />
        Delete enum
      </button>
    </div>
  );
}

function NoteInspector({
  note,
  updateSchema,
  setSelection,
}: {
  note: SchemaNote;
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void;
  setSelection: (selection: Selection) => void;
}) {
  return (
    <div className="inspector">
      <InspectorHeading icon={<Braces size={20} />} eyebrow="Note" title={note.title || 'Untitled note'} />
      <FieldLabel label="Title">
        <input value={note.title} onChange={(event) => patchNote(updateSchema, note.id, { title: event.target.value })} />
      </FieldLabel>
      <FieldLabel label="Body">
        <textarea className="tall-textarea" value={note.body} onChange={(event) => patchNote(updateSchema, note.id, { body: event.target.value })} />
      </FieldLabel>
      <button type="button" className="danger-button" onClick={() => deleteNote(updateSchema, note.id, setSelection)}>
        <Trash2 size={16} />
        Delete note
      </button>
    </div>
  );
}

function IndexEditor({
  table,
  index,
  updateSchema,
}: {
  table: SchemaTable;
  index: SchemaIndex;
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void;
}) {
  const selectedFields = new Set(index.fields);

  return (
    <div className="index-editor">
      <input
        value={index.name}
        aria-label="Index name"
        onChange={(event) => patchTableIndex(updateSchema, table.id, index.id, { name: event.target.value })}
      />
      <Toggle
        label="Unique"
        checked={index.unique}
        onChange={(checked) => patchTableIndex(updateSchema, table.id, index.id, { unique: checked })}
      />
      <div className="index-field-grid">
        {table.fields.map((field) => (
          <label key={field.id}>
            <input
              type="checkbox"
              checked={selectedFields.has(field.id)}
              onChange={(event) => {
                const nextFields = event.target.checked
                  ? [...index.fields, field.id]
                  : index.fields.filter((fieldId) => fieldId !== field.id);
                patchTableIndex(updateSchema, table.id, index.id, { fields: nextFields });
              }}
            />
            {field.name}
          </label>
        ))}
      </div>
      <button type="button" className="link-danger" onClick={() => deleteIndex(updateSchema, table.id, index.id)}>
        Remove index
      </button>
    </div>
  );
}

function InspectorHeading({ icon, eyebrow, title }: { icon: ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="inspector-heading">
      <div className="inspector-icon">{icon}</div>
      <div>
        <span className="section-label">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-control">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

type SelectedEntity =
  | { kind: 'canvas' }
  | { kind: 'table'; table: SchemaTable }
  | { kind: 'field'; table: SchemaTable; field: SchemaField }
  | { kind: 'relation'; relation: SchemaRelation }
  | { kind: 'enum'; schemaEnum: SchemaEnum }
  | { kind: 'note'; note: SchemaNote };

function useSelectedEntity(schema: SchemaDocument, selection: Selection): SelectedEntity {
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

function usePersistentSchema(): [SchemaDocument, React.Dispatch<React.SetStateAction<SchemaDocument>>] {
  const [schema, setSchema] = useState<SchemaDocument>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? normalizeSchema(JSON.parse(stored)) : createTemplateSchema('content');
    } catch {
      return createTemplateSchema('content');
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
  }, [schema]);

  return [schema, setSchema];
}

function patchTable(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  tableId: string,
  patch: Partial<SchemaTable>,
) {
  updateSchema((current) => ({
    ...current,
    tables: current.tables.map((table) => (table.id === tableId ? { ...table, ...patch } : table)),
  }));
}

function patchTableField(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  tableId: string,
  fieldId: string,
  patch: Partial<SchemaField>,
) {
  updateSchema((current) => ({
    ...current,
    tables: current.tables.map((table) =>
      table.id === tableId
        ? {
            ...table,
            fields: table.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
          }
        : table,
    ),
  }));
}

function patchTableIndex(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  tableId: string,
  indexId: string,
  patch: Partial<SchemaIndex>,
) {
  updateSchema((current) => ({
    ...current,
    tables: current.tables.map((table) =>
      table.id === tableId
        ? {
            ...table,
            indexes: table.indexes.map((index) => (index.id === indexId ? { ...index, ...patch } : index)),
          }
        : table,
    ),
  }));
}

function patchRelation(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  relationId: string,
  patch: Partial<SchemaRelation>,
) {
  updateSchema((current) => ({
    ...current,
    relations: current.relations.map((relation) => (relation.id === relationId ? { ...relation, ...patch } : relation)),
  }));
}

function patchEnum(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  enumId: string,
  patch: Partial<SchemaEnum>,
) {
  updateSchema((current) => ({
    ...current,
    enums: current.enums.map((schemaEnum) => (schemaEnum.id === enumId ? { ...schemaEnum, ...patch } : schemaEnum)),
  }));
}

function patchNote(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  noteId: string,
  patch: Partial<SchemaNote>,
) {
  updateSchema((current) => ({
    ...current,
    notes: current.notes.map((note) => (note.id === noteId ? { ...note, ...patch } : note)),
  }));
}

function deleteTable(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  tableId: string,
  setSelection: (selection: Selection) => void,
) {
  updateSchema((current) => ({
    ...current,
    tables: current.tables.filter((table) => table.id !== tableId),
    relations: current.relations.filter((relation) => relation.from.tableId !== tableId && relation.to.tableId !== tableId),
  }));
  setSelection({ kind: 'canvas' });
}

function deleteField(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  tableId: string,
  fieldId: string,
  setSelection: (selection: Selection) => void,
) {
  updateSchema((current) => ({
    ...current,
    tables: current.tables.map((table) =>
      table.id === tableId
        ? {
            ...table,
            fields: table.fields.filter((field) => field.id !== fieldId),
            indexes: table.indexes
              .map((index) => ({ ...index, fields: index.fields.filter((candidate) => candidate !== fieldId) }))
              .filter((index) => index.fields.length > 0),
          }
        : table,
    ),
    relations: current.relations.filter((relation) => relation.from.fieldId !== fieldId && relation.to.fieldId !== fieldId),
  }));
  setSelection({ kind: 'table', tableId });
}

function deleteRelation(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  relationId: string,
  setSelection: (selection: Selection) => void,
) {
  updateSchema((current) => ({
    ...current,
    relations: current.relations.filter((relation) => relation.id !== relationId),
  }));
  setSelection({ kind: 'canvas' });
}

function deleteEnum(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  enumId: string,
  setSelection: (selection: Selection) => void,
) {
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

function deleteNote(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  noteId: string,
  setSelection: (selection: Selection) => void,
) {
  updateSchema((current) => ({
    ...current,
    notes: current.notes.filter((note) => note.id !== noteId),
  }));
  setSelection({ kind: 'canvas' });
}

function deleteIndex(
  updateSchema: (updater: (current: SchemaDocument) => SchemaDocument) => void,
  tableId: string,
  indexId: string,
) {
  updateSchema((current) => ({
    ...current,
    tables: current.tables.map((table) =>
      table.id === tableId ? { ...table, indexes: table.indexes.filter((index) => index.id !== indexId) } : table,
    ),
  }));
}

function describeRelationEndpoints(schema: SchemaDocument, relation: SchemaRelation) {
  const fromTable = schema.tables.find((table) => table.id === relation.from.tableId);
  const toTable = schema.tables.find((table) => table.id === relation.to.tableId);
  const fromField = fromTable?.fields.find((field) => field.id === relation.from.fieldId);
  const toField = toTable?.fields.find((field) => field.id === relation.to.fieldId);

  return {
    from: `${fromTable?.name ?? 'missing'}.${fromField?.name ?? 'missing'}`,
    to: `${toTable?.name ?? 'missing'}.${toField?.name ?? 'missing'}`,
  };
}

function getIssueCounts(issues: ValidationIssue[]) {
  return {
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
  };
}

function uniqueName(base: string, existing: string[]) {
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

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'schema';
}
