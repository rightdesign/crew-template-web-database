// Table bindings: the tables this app uses, by the name it knows them under.
// Set the table's id (a data model id) in the environment. The admin must also
// grant the table to the role the app's key is bound to; until then every call
// is refused with 403 and the routes below report it as such.
//
// This binds one sample table. Add more entries the same way.
export function loadBindings(env = process.env) {
  return {
    items: {
      tableId: env.SAMPLE_TABLE_ID || '',
      // Columns the create route accepts. Keep the list explicit so a request
      // cannot set system columns or fields you did not mean to expose.
      writable: (env.SAMPLE_TABLE_COLUMNS || 'name').split(',').map((s) => s.trim()).filter(Boolean),
    },
  };
}
