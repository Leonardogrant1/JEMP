#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Sport-Banner & Trainings-Animationen zwischen Umgebungen syncen.
//
//   node scripts/seed-assets.mjs pull   → lädt alle Assets der Ziel-DB
//                                         nach supabase/seed-assets/
//   node scripts/seed-assets.mjs push   → lädt supabase/seed-assets/ in die
//                                         Ziel-DB hoch und setzt die DB-Pfade
//
// Ziel-Umgebung über Env-Vars (Default: lokale Supabase-Instanz):
//   SUPABASE_URL=https://xyz.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/seed-assets.mjs push --remote
//
// Nicht-lokale Ziele brauchen explizit --remote als Bestätigung.
//
// Ablage im Repo (deterministische Namen nach Slug/Gruppe):
//   supabase/seed-assets/sport-banners/sports/<slug>.<ext>
//   supabase/seed-assets/sport-banners/groups/<group>.<ext>
//   supabase/seed-assets/sport-animations/sports/<slug>.json
//   supabase/seed-assets/sport-animations/groups/<group>.json
//   supabase/seed-assets/exercise-thumbnails/<exercise-slug>.<ext>
//
// Upload nutzt die Admin-Panel-Konventionen: Sport-Assets mit timestamped
// Pfad (frische CDN-URL, alter Pfad wird gelöscht), Exercise-Thumbnails mit
// stabilem Pfad `thumbnails/<exerciseId>.<ext>` + Upsert.
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL_URL = 'http://127.0.0.1:54321';
// Öffentlicher Demo-Key der lokalen Supabase-CLI — kein Secret
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const url = process.env.SUPABASE_URL ?? LOCAL_URL;
const isLocal = url.includes('127.0.0.1') || url.includes('localhost');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? (isLocal ? LOCAL_SERVICE_KEY : null);

const command = process.argv[2];
const confirmedRemote = process.argv.includes('--remote');

if (!['pull', 'push'].includes(command)) {
    console.error('Usage: node scripts/seed-assets.mjs <pull|push> [--remote]');
    process.exit(1);
}
if (!serviceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY fehlt (für nicht-lokale Ziele erforderlich).');
    process.exit(1);
}
if (!isLocal && !confirmedRemote) {
    console.error(`Ziel ${url} ist nicht lokal — bestätige mit --remote.`);
    process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = path.join(repoRoot, 'supabase', 'seed-assets');

const CONTENT_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.json': 'application/json',
};

// Ein Eintrag pro Asset-Art: wo es im Storage liegt, wo es im Repo liegt
// und wie der DB-Pfad gepflegt wird
const KINDS = [
    {
        bucket: 'sport-banners',
        localDir: 'sport-banners/sports',
        storagePrefix: 'banners',
        keyBy: 'sport',
        column: 'banner_storage_path',
    },
    {
        bucket: 'sport-banners',
        localDir: 'sport-banners/groups',
        storagePrefix: 'groups',
        keyBy: 'group',
        table: 'sport_group_banners',
        column: 'banner_storage_path',
    },
    {
        bucket: 'sport-animations',
        localDir: 'sport-animations/sports',
        storagePrefix: 'animations',
        keyBy: 'sport',
        column: 'animation_storage_path',
    },
    {
        bucket: 'sport-animations',
        localDir: 'sport-animations/groups',
        storagePrefix: 'groups',
        keyBy: 'group',
        table: 'sport_group_animations',
        column: 'animation_storage_path',
    },
];

function fail(message, error) {
    console.error(`✗ ${message}${error ? `: ${error.message ?? error}` : ''}`);
    process.exitCode = 1;
}

async function loadSports() {
    const { data, error } = await supabase
        .from('sports')
        .select('id, slug, banner_storage_path, animation_storage_path');
    if (error) throw new Error(`sports laden fehlgeschlagen: ${error.message}`);
    return data;
}

async function loadGroupRows(table, column) {
    const { data, error } = await supabase.from(table).select(`group_name, ${column}`);
    if (error) throw new Error(`${table} laden fehlgeschlagen: ${error.message}`);
    return data;
}

// ── pull ─────────────────────────────────────────────────────

async function download(bucket, storagePath, targetFile) {
    const { data, error } = await supabase.storage.from(bucket).download(storagePath);
    if (error) { fail(`Download ${bucket}/${storagePath}`, error); return; }
    await mkdir(path.dirname(targetFile), { recursive: true });
    await writeFile(targetFile, Buffer.from(await data.arrayBuffer()));
    console.log(`✓ ${path.relative(repoRoot, targetFile)}`);
}

async function loadExercises() {
    const { data, error } = await supabase
        .from('exercises')
        .select('id, slug, thumbnail_storage_path');
    if (error) throw new Error(`exercises laden fehlgeschlagen: ${error.message}`);
    return data;
}

const EXERCISE_DIR = 'exercise-thumbnails';

async function pullExercises() {
    const exercises = await loadExercises();
    for (const exercise of exercises) {
        if (!exercise.thumbnail_storage_path) continue;
        const ext = path.extname(exercise.thumbnail_storage_path) || '.jpg';
        await download(
            'exercises',
            exercise.thumbnail_storage_path,
            path.join(assetsRoot, EXERCISE_DIR, `${exercise.slug}${ext}`),
        );
    }
}

async function pushExercises() {
    const dir = path.join(assetsRoot, EXERCISE_DIR);
    if (!existsSync(dir)) return;
    const files = (await readdir(dir)).filter((f) => !f.startsWith('.'));
    if (files.length === 0) return;

    const exercises = await loadExercises();
    const bySlug = new Map(exercises.map((e) => [e.slug, e]));

    for (const fileName of files) {
        const slug = path.basename(fileName, path.extname(fileName));
        const exercise = bySlug.get(slug);
        if (!exercise) { fail(`Keine Übung mit Slug '${slug}' (${fileName})`); continue; }

        const ext = path.extname(fileName);
        const contentType = CONTENT_TYPES[ext];
        if (!contentType) { fail(`Unbekannte Extension ${ext} (${fileName})`); continue; }

        // Timestamped Pfad wie das Admin-Panel — Updates bekommen eine frische
        // CDN-URL, der alte Pfad wird danach aufgeräumt
        const storagePath = `thumbnails/${exercise.id}-${Date.now()}${ext}`;
        const body = await readFile(path.join(dir, fileName));
        const { error } = await supabase.storage
            .from('exercises')
            .upload(storagePath, body, { contentType });
        if (error) { fail(`Upload exercises/${storagePath}`, error); continue; }

        const { error: dbError } = await supabase
            .from('exercises')
            .update({ thumbnail_storage_path: storagePath })
            .eq('id', exercise.id);
        if (dbError) { fail(`exercises.thumbnail_storage_path für '${slug}'`, dbError); continue; }

        if (exercise.thumbnail_storage_path && exercise.thumbnail_storage_path !== storagePath) {
            await supabase.storage.from('exercises').remove([exercise.thumbnail_storage_path]);
        }
        console.log(`✓ ${EXERCISE_DIR}/${fileName}`);
    }
}

async function pull() {
    const sports = await loadSports();

    for (const kind of KINDS) {
        if (kind.keyBy === 'sport') {
            for (const sport of sports) {
                const storagePath = sport[kind.column];
                if (!storagePath) continue;
                const ext = path.extname(storagePath) || '.bin';
                await download(kind.bucket, storagePath, path.join(assetsRoot, kind.localDir, `${sport.slug}${ext}`));
            }
        } else {
            for (const row of await loadGroupRows(kind.table, kind.column)) {
                const storagePath = row[kind.column];
                if (!storagePath) continue;
                const ext = path.extname(storagePath) || '.bin';
                await download(kind.bucket, storagePath, path.join(assetsRoot, kind.localDir, `${row.group_name}${ext}`));
            }
        }
    }
}

// ── push ─────────────────────────────────────────────────────

async function upload(kind, key, file, oldPath) {
    const ext = path.extname(file);
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) { fail(`Unbekannte Extension ${ext} (${file})`); return null; }

    // Admin-Panel-Konvention: timestamped Pfad = frische CDN-URL
    const storagePath = `${kind.storagePrefix}/${key}-${Date.now()}${ext}`;
    const body = await readFile(file);
    const { error } = await supabase.storage.from(kind.bucket).upload(storagePath, body, { contentType });
    if (error) { fail(`Upload ${kind.bucket}/${storagePath}`, error); return null; }

    if (oldPath && oldPath !== storagePath) {
        await supabase.storage.from(kind.bucket).remove([oldPath]);
    }
    return storagePath;
}

async function push() {
    const sports = await loadSports();
    const sportBySlug = new Map(sports.map((s) => [s.slug, s]));

    for (const kind of KINDS) {
        const dir = path.join(assetsRoot, kind.localDir);
        if (!existsSync(dir)) continue;
        const files = (await readdir(dir)).filter((f) => !f.startsWith('.'));

        for (const fileName of files) {
            const key = path.basename(fileName, path.extname(fileName));
            const file = path.join(dir, fileName);

            if (kind.keyBy === 'sport') {
                const sport = sportBySlug.get(key);
                if (!sport) { fail(`Kein Sport mit Slug '${key}' (${fileName})`); continue; }
                const storagePath = await upload(kind, sport.id, file, sport[kind.column]);
                if (!storagePath) continue;
                const { error } = await supabase.from('sports').update({ [kind.column]: storagePath }).eq('id', sport.id);
                if (error) { fail(`sports.${kind.column} für '${key}'`, error); continue; }
            } else {
                const { data: old } = await supabase
                    .from(kind.table)
                    .select(kind.column)
                    .eq('group_name', key)
                    .maybeSingle();
                const storagePath = await upload(kind, key, file, old?.[kind.column] ?? null);
                if (!storagePath) continue;
                const { error } = await supabase
                    .from(kind.table)
                    .upsert({ group_name: key, [kind.column]: storagePath, updated_at: new Date().toISOString() });
                if (error) { fail(`${kind.table} für '${key}'`, error); continue; }
            }
            console.log(`✓ ${kind.localDir}/${fileName}`);
        }
    }
}

console.log(`${command === 'pull' ? 'Pull aus' : 'Push nach'} ${url}`);
if (command === 'pull') {
    await pull();
    await pullExercises();
} else {
    await push();
    await pushExercises();
}
