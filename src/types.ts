export type FieldType =
  | 'uuid'
  | 'string'
  | 'text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'enum'
  | 'relation';

export type RelationCardinality = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

export type DeleteAction = 'restrict' | 'cascade' | 'set-null' | 'no-action';

export type XYPosition = {
  x: number;
  y: number;
};

export type SchemaField = {
  id: string;
  name: string;
  type: FieldType;
  primaryKey: boolean;
  required: boolean;
  unique: boolean;
  default: string;
  description: string;
  enumId?: string;
};

export type SchemaIndex = {
  id: string;
  name: string;
  fields: string[];
  unique: boolean;
};

export type SchemaTable = {
  id: string;
  name: string;
  description: string;
  position: XYPosition;
  fields: SchemaField[];
  indexes: SchemaIndex[];
};

export type RelationEndpoint = {
  tableId: string;
  fieldId: string;
};

export type SchemaRelation = {
  id: string;
  from: RelationEndpoint;
  to: RelationEndpoint;
  cardinality: RelationCardinality;
  onDelete: DeleteAction;
  label: string;
};

export type SchemaEnum = {
  id: string;
  name: string;
  values: string[];
  position: XYPosition;
};

export type SchemaNote = {
  id: string;
  title: string;
  body: string;
  position: XYPosition;
};

export type SchemaDocument = {
  version: 1;
  project: {
    name: string;
    updatedAt: string;
  };
  tables: SchemaTable[];
  relations: SchemaRelation[];
  enums: SchemaEnum[];
  notes: SchemaNote[];
};

export type Selection =
  | { kind: 'canvas' }
  | { kind: 'table'; tableId: string }
  | { kind: 'field'; tableId: string; fieldId: string }
  | { kind: 'relation'; relationId: string }
  | { kind: 'enum'; enumId: string }
  | { kind: 'note'; noteId: string };

export type ValidationIssue = {
  id: string;
  severity: 'warning' | 'error';
  message: string;
};
