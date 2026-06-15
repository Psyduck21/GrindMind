import * as SQLite from 'expo-sqlite';

// Open or create the database
export const db = SQLite.openDatabaseSync('grindmind.db');

export const initDb = async () => {
  // Turn on foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
};
