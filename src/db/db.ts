import * as SQLite from 'expo-sqlite';

// Open or create the database
export const db = SQLite.openDatabaseSync('grindmind.db');

export const initDb = () => {
  // Turn on foreign keys
  db.execSync('PRAGMA foreign_keys = ON;');
};
