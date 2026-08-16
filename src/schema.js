export const FIELD_TYPES = [
    'uuid',
    'string',
    'text',
    'integer',
    'decimal',
    'boolean',
    'date',
    'datetime',
    'json',
    'enum',
    'relation',
];
export const CARDINALITIES = [
    'one-to-one',
    'one-to-many',
    'many-to-one',
    'many-to-many',
];
export const DELETE_ACTIONS = ['restrict', 'cascade', 'set-null', 'no-action'];
export const TYPE_COLORS = {
    uuid: '#2f70c6',
    string: '#177e89',
    text: '#7161ef',
    integer: '#c65f28',
    decimal: '#9b5de5',
    boolean: '#108b5a',
    date: '#c43d6b',
    datetime: '#8a5a44',
    json: '#586f7c',
    enum: '#b08900',
    relation: '#d1495b',
};
const fieldTypeSet = new Set(FIELD_TYPES);
const cardinalitySet = new Set(CARDINALITIES);
const deleteActionSet = new Set(DELETE_ACTIONS);
export function createId(prefix) {
    const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    return `${prefix}_${token}`;
}
export function touchSchema(schema) {
    return {
        ...schema,
        project: {
            ...schema.project,
            updatedAt: new Date().toISOString(),
        },
    };
}
export function sourceHandleId(fieldId) {
    return `source:${fieldId}`;
}
export function targetHandleId(fieldId) {
    return `target:${fieldId}`;
}
export function parseFieldHandle(handleId) {
    if (!handleId) {
        return null;
    }
    const separator = handleId.indexOf(':');
    if (separator === -1) {
        return null;
    }
    return handleId.slice(separator + 1);
}
export function createField(overrides = {}) {
    return {
        id: overrides.id ?? createId('field'),
        name: overrides.name ?? 'new_field',
        type: overrides.type ?? 'string',
        primaryKey: overrides.primaryKey ?? false,
        required: overrides.required ?? false,
        unique: overrides.unique ?? false,
        default: overrides.default ?? '',
        description: overrides.description ?? '',
        enumId: overrides.enumId,
    };
}
export function createTable(name, position) {
    const id = createId('table');
    return {
        id,
        name,
        description: '',
        position,
        fields: [
            createField({
                id: createId('field'),
                name: 'id',
                type: 'uuid',
                primaryKey: true,
                required: true,
                unique: true,
                default: 'generated',
            }),
            createField({ id: createId('field'), name: 'created_at', type: 'datetime', required: true }),
        ],
        indexes: [],
    };
}
export function createIndex(fields) {
    return {
        id: createId('index'),
        name: 'idx_new',
        fields,
        unique: false,
    };
}
export function createEnum(position) {
    return {
        id: createId('enum'),
        name: 'status',
        values: ['draft', 'active', 'archived'],
        position,
    };
}
export function createNote(position) {
    return {
        id: createId('note'),
        title: 'Design note',
        body: 'Capture schema intent, migration concerns, or query ideas here.',
        position,
    };
}
export function createStarterSchema() {
    const userId = 'field_users_id';
    const postId = 'field_posts_id';
    const categoryId = 'field_categories_id';
    const postAuthorId = 'field_posts_author_id';
    const postCategoryId = 'field_posts_category_id';
    const statusEnumId = 'enum_post_status';
    return {
        version: 1,
        project: {
            name: 'Local Schema Plan',
            updatedAt: new Date().toISOString(),
        },
        tables: [
            {
                id: 'table_users',
                name: 'users',
                description: 'People who can sign in and own records.',
                position: { x: 80, y: 90 },
                fields: [
                    createField({
                        id: userId,
                        name: 'id',
                        type: 'uuid',
                        primaryKey: true,
                        required: true,
                        unique: true,
                        default: 'generated',
                    }),
                    createField({ id: 'field_users_email', name: 'email', type: 'string', required: true, unique: true }),
                    createField({ id: 'field_users_name', name: 'display_name', type: 'string', required: true }),
                    createField({ id: 'field_users_created', name: 'created_at', type: 'datetime', required: true }),
                ],
                indexes: [
                    {
                        id: 'index_users_email',
                        name: 'idx_users_email',
                        fields: ['field_users_email'],
                        unique: true,
                    },
                ],
            },
            {
                id: 'table_posts',
                name: 'posts',
                description: 'Content entries owned by users and grouped by category.',
                position: { x: 470, y: 120 },
                fields: [
                    createField({
                        id: postId,
                        name: 'id',
                        type: 'uuid',
                        primaryKey: true,
                        required: true,
                        unique: true,
                        default: 'generated',
                    }),
                    createField({ id: postAuthorId, name: 'author_id', type: 'uuid', required: true }),
                    createField({ id: postCategoryId, name: 'category_id', type: 'uuid', required: true }),
                    createField({ id: 'field_posts_title', name: 'title', type: 'string', required: true }),
                    createField({ id: 'field_posts_status', name: 'status', type: 'enum', required: true, enumId: statusEnumId }),
                    createField({ id: 'field_posts_published', name: 'published_at', type: 'datetime' }),
                ],
                indexes: [
                    {
                        id: 'index_posts_author',
                        name: 'idx_posts_author',
                        fields: [postAuthorId],
                        unique: false,
                    },
                ],
            },
            {
                id: 'table_categories',
                name: 'categories',
                description: 'Simple taxonomy for grouping records.',
                position: { x: 920, y: 80 },
                fields: [
                    createField({
                        id: categoryId,
                        name: 'id',
                        type: 'uuid',
                        primaryKey: true,
                        required: true,
                        unique: true,
                        default: 'generated',
                    }),
                    createField({ id: 'field_categories_slug', name: 'slug', type: 'string', required: true, unique: true }),
                    createField({ id: 'field_categories_label', name: 'label', type: 'string', required: true }),
                ],
                indexes: [],
            },
        ],
        relations: [
            {
                id: 'rel_posts_author',
                from: { tableId: 'table_posts', fieldId: postAuthorId },
                to: { tableId: 'table_users', fieldId: userId },
                cardinality: 'many-to-one',
                onDelete: 'cascade',
                label: 'author',
            },
            {
                id: 'rel_posts_category',
                from: { tableId: 'table_posts', fieldId: postCategoryId },
                to: { tableId: 'table_categories', fieldId: categoryId },
                cardinality: 'many-to-one',
                onDelete: 'restrict',
                label: 'category',
            },
        ],
        enums: [
            {
                id: statusEnumId,
                name: 'post_status',
                values: ['draft', 'review', 'published', 'archived'],
                position: { x: 500, y: 460 },
            },
        ],
        notes: [
            {
                id: 'note_starter',
                title: 'Planner tip',
                body: 'Drag field handles to connect relationships. Export JSON when the diagram is ready.',
                position: { x: 80, y: 430 },
            },
        ],
    };
}
export function createBlankSchema() {
    return {
        version: 1,
        project: {
            name: 'Untitled Schema',
            updatedAt: new Date().toISOString(),
        },
        tables: [],
        relations: [],
        enums: [],
        notes: [],
    };
}
export function createTemplateSchema(template) {
    if (template === 'content') {
        return {
            ...createStarterSchema(),
            project: {
                name: 'Content Platform Schema',
                updatedAt: new Date().toISOString(),
            },
        };
    }
    if (template === 'auth') {
        return createAuthTemplate();
    }
    return createCommerceTemplate();
}
function createAuthTemplate() {
    return {
        version: 1,
        project: {
            name: 'Auth Schema',
            updatedAt: new Date().toISOString(),
        },
        tables: [
            {
                id: 'table_auth_users',
                name: 'users',
                description: 'Primary account records.',
                position: { x: 120, y: 120 },
                fields: [
                    createField({ id: 'field_auth_users_id', name: 'id', type: 'uuid', primaryKey: true, required: true, unique: true }),
                    createField({ id: 'field_auth_users_email', name: 'email', type: 'string', required: true, unique: true }),
                    createField({ id: 'field_auth_users_password', name: 'password_hash', type: 'string', required: true }),
                    createField({ id: 'field_auth_users_role', name: 'role', type: 'enum', required: true, enumId: 'enum_user_role' }),
                    createField({ id: 'field_auth_users_created', name: 'created_at', type: 'datetime', required: true }),
                ],
                indexes: [
                    { id: 'index_auth_users_email', name: 'idx_users_email', fields: ['field_auth_users_email'], unique: true },
                ],
            },
            {
                id: 'table_auth_profiles',
                name: 'profiles',
                description: 'Editable user-facing profile data.',
                position: { x: 520, y: 90 },
                fields: [
                    createField({ id: 'field_auth_profiles_id', name: 'id', type: 'uuid', primaryKey: true, required: true, unique: true }),
                    createField({ id: 'field_auth_profiles_user_id', name: 'user_id', type: 'uuid', required: true, unique: true }),
                    createField({ id: 'field_auth_profiles_name', name: 'display_name', type: 'string', required: true }),
                    createField({ id: 'field_auth_profiles_meta', name: 'preferences', type: 'json' }),
                ],
                indexes: [],
            },
            {
                id: 'table_auth_sessions',
                name: 'sessions',
                description: 'Refresh/session records tied to users.',
                position: { x: 900, y: 140 },
                fields: [
                    createField({ id: 'field_auth_sessions_id', name: 'id', type: 'uuid', primaryKey: true, required: true, unique: true }),
                    createField({ id: 'field_auth_sessions_user_id', name: 'user_id', type: 'uuid', required: true }),
                    createField({ id: 'field_auth_sessions_token', name: 'token_hash', type: 'string', required: true, unique: true }),
                    createField({ id: 'field_auth_sessions_expires', name: 'expires_at', type: 'datetime', required: true }),
                ],
                indexes: [
                    { id: 'index_auth_sessions_user', name: 'idx_sessions_user', fields: ['field_auth_sessions_user_id'], unique: false },
                ],
            },
        ],
        relations: [
            {
                id: 'rel_auth_profile_user',
                from: { tableId: 'table_auth_profiles', fieldId: 'field_auth_profiles_user_id' },
                to: { tableId: 'table_auth_users', fieldId: 'field_auth_users_id' },
                cardinality: 'one-to-one',
                onDelete: 'cascade',
                label: 'profile owner',
            },
            {
                id: 'rel_auth_session_user',
                from: { tableId: 'table_auth_sessions', fieldId: 'field_auth_sessions_user_id' },
                to: { tableId: 'table_auth_users', fieldId: 'field_auth_users_id' },
                cardinality: 'many-to-one',
                onDelete: 'cascade',
                label: 'session owner',
            },
        ],
        enums: [{ id: 'enum_user_role', name: 'user_role', values: ['owner', 'admin', 'member'], position: { x: 520, y: 430 } }],
        notes: [{ id: 'note_auth', title: 'Auth boundary', body: 'Keep login credentials separate from editable profile fields.', position: { x: 120, y: 440 } }],
    };
}
function createCommerceTemplate() {
    return {
        version: 1,
        project: {
            name: 'Commerce Schema',
            updatedAt: new Date().toISOString(),
        },
        tables: [
            {
                id: 'table_shop_customers',
                name: 'customers',
                description: 'Buyers and contact records.',
                position: { x: 80, y: 90 },
                fields: [
                    createField({ id: 'field_shop_customers_id', name: 'id', type: 'uuid', primaryKey: true, required: true, unique: true }),
                    createField({ id: 'field_shop_customers_email', name: 'email', type: 'string', required: true, unique: true }),
                    createField({ id: 'field_shop_customers_name', name: 'name', type: 'string', required: true }),
                ],
                indexes: [],
            },
            {
                id: 'table_shop_products',
                name: 'products',
                description: 'Catalog items available for purchase.',
                position: { x: 500, y: 80 },
                fields: [
                    createField({ id: 'field_shop_products_id', name: 'id', type: 'uuid', primaryKey: true, required: true, unique: true }),
                    createField({ id: 'field_shop_products_sku', name: 'sku', type: 'string', required: true, unique: true }),
                    createField({ id: 'field_shop_products_title', name: 'title', type: 'string', required: true }),
                    createField({ id: 'field_shop_products_price', name: 'price', type: 'decimal', required: true }),
                ],
                indexes: [],
            },
            {
                id: 'table_shop_orders',
                name: 'orders',
                description: 'Checkout containers and payment state.',
                position: { x: 80, y: 390 },
                fields: [
                    createField({ id: 'field_shop_orders_id', name: 'id', type: 'uuid', primaryKey: true, required: true, unique: true }),
                    createField({ id: 'field_shop_orders_customer_id', name: 'customer_id', type: 'uuid', required: true }),
                    createField({ id: 'field_shop_orders_status', name: 'status', type: 'enum', required: true, enumId: 'enum_order_status' }),
                    createField({ id: 'field_shop_orders_total', name: 'total', type: 'decimal', required: true }),
                ],
                indexes: [],
            },
            {
                id: 'table_shop_order_items',
                name: 'order_items',
                description: 'Line items in each order.',
                position: { x: 520, y: 390 },
                fields: [
                    createField({ id: 'field_shop_items_id', name: 'id', type: 'uuid', primaryKey: true, required: true, unique: true }),
                    createField({ id: 'field_shop_items_order_id', name: 'order_id', type: 'uuid', required: true }),
                    createField({ id: 'field_shop_items_product_id', name: 'product_id', type: 'uuid', required: true }),
                    createField({ id: 'field_shop_items_qty', name: 'quantity', type: 'integer', required: true }),
                    createField({ id: 'field_shop_items_unit', name: 'unit_price', type: 'decimal', required: true }),
                ],
                indexes: [],
            },
        ],
        relations: [
            {
                id: 'rel_shop_orders_customer',
                from: { tableId: 'table_shop_orders', fieldId: 'field_shop_orders_customer_id' },
                to: { tableId: 'table_shop_customers', fieldId: 'field_shop_customers_id' },
                cardinality: 'many-to-one',
                onDelete: 'restrict',
                label: 'buyer',
            },
            {
                id: 'rel_shop_items_order',
                from: { tableId: 'table_shop_order_items', fieldId: 'field_shop_items_order_id' },
                to: { tableId: 'table_shop_orders', fieldId: 'field_shop_orders_id' },
                cardinality: 'many-to-one',
                onDelete: 'cascade',
                label: 'order lines',
            },
            {
                id: 'rel_shop_items_product',
                from: { tableId: 'table_shop_order_items', fieldId: 'field_shop_items_product_id' },
                to: { tableId: 'table_shop_products', fieldId: 'field_shop_products_id' },
                cardinality: 'many-to-one',
                onDelete: 'restrict',
                label: 'sold product',
            },
        ],
        enums: [{ id: 'enum_order_status', name: 'order_status', values: ['draft', 'paid', 'fulfilled', 'refunded'], position: { x: 930, y: 250 } }],
        notes: [{ id: 'note_shop', title: 'Money fields', body: 'Use decimal for financial values and keep historical item prices on order_items.', position: { x: 930, y: 90 } }],
    };
}
export function normalizeSchema(value) {
    if (!isRecord(value)) {
        throw new Error('Imported JSON must be an object.');
    }
    const tables = readArray(value.tables).map(normalizeTable);
    const enums = readArray(value.enums).map(normalizeEnum);
    const notes = readArray(value.notes).map(normalizeNote);
    return {
        version: 1,
        project: {
            name: readString(isRecord(value.project) ? value.project.name : undefined, 'Imported Schema'),
            updatedAt: readString(isRecord(value.project) ? value.project.updatedAt : undefined, new Date().toISOString()),
        },
        tables,
        relations: readArray(value.relations).map(normalizeRelation),
        enums,
        notes,
    };
}
export function validateSchema(schema) {
    const issues = [];
    const tableNames = new Map();
    const tableIds = new Set(schema.tables.map((table) => table.id));
    const enumIds = new Set(schema.enums.map((schemaEnum) => schemaEnum.id));
    const fieldLookup = new Map();
    schema.tables.forEach((table) => {
        const normalizedName = table.name.trim().toLowerCase();
        tableNames.set(normalizedName, (tableNames.get(normalizedName) ?? 0) + 1);
        if (!table.name.trim()) {
            issues.push({ id: `table-name-${table.id}`, severity: 'error', message: 'A table is missing a name.' });
        }
        if (!table.fields.length) {
            issues.push({ id: `table-empty-${table.id}`, severity: 'warning', message: `${table.name} has no fields.` });
        }
        if (!table.fields.some((field) => field.primaryKey)) {
            issues.push({ id: `table-pk-${table.id}`, severity: 'warning', message: `${table.name} has no primary key.` });
        }
        const fieldNames = new Map();
        table.fields.forEach((field) => {
            const fieldKey = `${table.id}:${field.id}`;
            fieldLookup.set(fieldKey, field);
            const normalizedFieldName = field.name.trim().toLowerCase();
            fieldNames.set(normalizedFieldName, (fieldNames.get(normalizedFieldName) ?? 0) + 1);
            if (!field.name.trim()) {
                issues.push({ id: `field-name-${field.id}`, severity: 'error', message: `${table.name} has a field with no name.` });
            }
            if (field.type === 'enum' && (!field.enumId || !enumIds.has(field.enumId))) {
                issues.push({
                    id: `field-enum-${field.id}`,
                    severity: 'warning',
                    message: `${table.name}.${field.name} is an enum field without a valid enum.`,
                });
            }
        });
        fieldNames.forEach((count, fieldName) => {
            if (fieldName && count > 1) {
                issues.push({
                    id: `duplicate-field-${table.id}-${fieldName}`,
                    severity: 'error',
                    message: `${table.name} has duplicate field name "${fieldName}".`,
                });
            }
        });
    });
    tableNames.forEach((count, tableName) => {
        if (tableName && count > 1) {
            issues.push({
                id: `duplicate-table-${tableName}`,
                severity: 'error',
                message: `Duplicate table name "${tableName}".`,
            });
        }
    });
    schema.relations.forEach((relation) => {
        if (!tableIds.has(relation.from.tableId) || !tableIds.has(relation.to.tableId)) {
            issues.push({
                id: `relation-table-${relation.id}`,
                severity: 'error',
                message: `Relation "${relation.label || relation.id}" points to a missing table.`,
            });
            return;
        }
        const fromField = fieldLookup.get(`${relation.from.tableId}:${relation.from.fieldId}`);
        const toField = fieldLookup.get(`${relation.to.tableId}:${relation.to.fieldId}`);
        if (!fromField || !toField) {
            issues.push({
                id: `relation-field-${relation.id}`,
                severity: 'error',
                message: `Relation "${relation.label || relation.id}" points to a missing field.`,
            });
            return;
        }
        if (fromField.type !== toField.type && fromField.type !== 'relation' && toField.type !== 'relation') {
            issues.push({
                id: `relation-type-${relation.id}`,
                severity: 'warning',
                message: `Relation "${relation.label || relation.id}" connects ${fromField.type} to ${toField.type}.`,
            });
        }
    });
    return issues;
}
function normalizeTable(value, index) {
    const record = isRecord(value) ? value : {};
    return {
        id: readString(record.id, createId('table')),
        name: readString(record.name, `table_${index + 1}`),
        description: readString(record.description, ''),
        position: normalizePosition(record.position, { x: 100 + index * 360, y: 120 }),
        fields: readArray(record.fields).map(normalizeField),
        indexes: readArray(record.indexes).map(normalizeIndex),
    };
}
function normalizeField(value, index) {
    const record = isRecord(value) ? value : {};
    const rawType = readString(record.type, 'string');
    return {
        id: readString(record.id, createId('field')),
        name: readString(record.name, `field_${index + 1}`),
        type: fieldTypeSet.has(rawType) ? rawType : 'string',
        primaryKey: readBoolean(record.primaryKey, false),
        required: readBoolean(record.required, false),
        unique: readBoolean(record.unique, false),
        default: readString(record.default, ''),
        description: readString(record.description, ''),
        enumId: typeof record.enumId === 'string' ? record.enumId : undefined,
    };
}
function normalizeIndex(value, index) {
    const record = isRecord(value) ? value : {};
    return {
        id: readString(record.id, createId('index')),
        name: readString(record.name, `idx_${index + 1}`),
        fields: readArray(record.fields).filter((fieldId) => typeof fieldId === 'string'),
        unique: readBoolean(record.unique, false),
    };
}
function normalizeRelation(value, index) {
    const record = isRecord(value) ? value : {};
    const from = isRecord(record.from) ? record.from : {};
    const to = isRecord(record.to) ? record.to : {};
    const cardinality = readString(record.cardinality, 'many-to-one');
    const onDelete = readString(record.onDelete, 'restrict');
    return {
        id: readString(record.id, createId('rel')),
        from: {
            tableId: readString(from.tableId, ''),
            fieldId: readString(from.fieldId, ''),
        },
        to: {
            tableId: readString(to.tableId, ''),
            fieldId: readString(to.fieldId, ''),
        },
        cardinality: cardinalitySet.has(cardinality) ? cardinality : 'many-to-one',
        onDelete: deleteActionSet.has(onDelete) ? onDelete : 'restrict',
        label: readString(record.label, `relation_${index + 1}`),
    };
}
function normalizeEnum(value, index) {
    const record = isRecord(value) ? value : {};
    return {
        id: readString(record.id, createId('enum')),
        name: readString(record.name, `enum_${index + 1}`),
        values: readArray(record.values).filter((item) => typeof item === 'string'),
        position: normalizePosition(record.position, { x: 160 + index * 300, y: 500 }),
    };
}
function normalizeNote(value, index) {
    const record = isRecord(value) ? value : {};
    return {
        id: readString(record.id, createId('note')),
        title: readString(record.title, `Note ${index + 1}`),
        body: readString(record.body, ''),
        position: normalizePosition(record.position, { x: 160 + index * 300, y: 600 }),
    };
}
function normalizePosition(value, fallback) {
    if (!isRecord(value)) {
        return fallback;
    }
    const x = typeof value.x === 'number' && Number.isFinite(value.x) ? value.x : fallback.x;
    const y = typeof value.y === 'number' && Number.isFinite(value.y) ? value.y : fallback.y;
    return { x, y };
}
function readString(value, fallback) {
    return typeof value === 'string' ? value : fallback;
}
function readBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}
function readArray(value) {
    return Array.isArray(value) ? value : [];
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
