export async function executeStatements(connection, statements) {
  for (const statement of statements) {
    await connection.execute(statement);
  }
}

export const id = "varchar(36)";
export const fk = "varchar(36)";
export const json = "json";
export const text = "longtext";
export const money = "int not null default 0";

export function timestamps() {
  return `
    created_at datetime not null default current_timestamp,
    updated_at datetime not null default current_timestamp on update current_timestamp,
    deleted_at datetime null
  `;
}
