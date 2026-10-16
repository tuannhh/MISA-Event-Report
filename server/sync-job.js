import {syncAll} from './ingestion.js';
import {pool} from './db.js';
try {await syncAll();} finally {await pool.end();}
