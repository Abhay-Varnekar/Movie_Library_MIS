/**
 * Synthetic seed for Movie Library MIS (Phase 1).
 * Run: npm run db:seed       (skips if movies already populated)
 *      npm run db:seed:force (truncates and reseeds)
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Schema must already be applied (supabase/migrations/001_initial_schema.sql).
 */
import 'dotenv/config';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import seedrandom from 'seedrandom';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const force = process.argv.includes('--force');
const rng = seedrandom('movie-library-mis-phase1');

// ---------- RNG helpers ----------
function rint(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function rfloat(min: number, max: number): number {
  return rng() * (max - min) + min;
}
function rpick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function rpickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
// Box-Muller normal
function rnorm(mean: number, sd: number): number {
  const u = 1 - rng();
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
function weightedPick<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const x of items) {
    if ((r -= x.weight) < 0) return x.value;
  }
  return items[items.length - 1].value;
}

// ---------- Word banks ----------
const GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Thriller',
  'Romance', 'Animation', 'Adventure', 'Crime', 'Fantasy',
  'Mystery', 'Sci-Fi', 'Biography', 'Documentary', 'Family',
];

const FIRST_NAMES = [
  'Alex', 'Maya', 'Liam', 'Olivia', 'Noah', 'Emma', 'Aarav', 'Diya', 'Ravi',
  'Priya', 'Sofia', 'Mateo', 'Yuki', 'Hiro', 'Mei', 'Chen', 'Kenji', 'Akira',
  'Lucas', 'Isabella', 'Ethan', 'Charlotte', 'Mia', 'Zhang', 'Wei', 'Lin',
  'Anya', 'Dmitri', 'Olga', 'Sergei', 'Hugo', 'Camille', 'Pierre', 'Marie',
  'Klaus', 'Greta', 'Hans', 'Ingrid', 'Mohammed', 'Fatima', 'Ali', 'Layla',
  'Carlos', 'Lucia', 'Diego', 'Valeria', 'Ji-ho', 'Min-ji', 'Joon', 'Seo-yeon',
];

const LAST_NAMES = [
  'Stone', 'Rivers', 'Hayes', 'Chen', 'Park', 'Sharma', 'Patel', 'Kapoor',
  'Tanaka', 'Nakamura', 'Wang', 'Li', 'Schmidt', 'Müller', 'Dubois', 'Laurent',
  'Rossi', 'Conti', 'Ivanov', 'Petrov', 'Khan', 'Ahmed', 'García', 'Lopez',
  'Kim', 'Lee', 'Ryan', 'Fox', 'Wells', 'Carter', 'Ward', 'Black', 'White',
  'Reed', 'Hunt', 'Lane', 'Cole', 'Frost', 'Hale', 'Moss', 'Pierce', 'Voss',
  'Quinn', 'Reyes', 'Ortega', 'Vega', 'Cruz', 'Mendez', 'Santos', 'Silva',
];

const COUNTRIES_W = [
  { value: 'USA', weight: 30 }, { value: 'UK', weight: 12 },
  { value: 'India', weight: 12 }, { value: 'Japan', weight: 8 },
  { value: 'France', weight: 7 }, { value: 'Germany', weight: 6 },
  { value: 'Spain', weight: 5 }, { value: 'South Korea', weight: 6 },
  { value: 'China', weight: 5 }, { value: 'Italy', weight: 4 },
  { value: 'Mexico', weight: 3 }, { value: 'Russia', weight: 2 },
];

const LANG_W = [
  { value: 'English', weight: 60 }, { value: 'Hindi', weight: 15 },
  { value: 'Spanish', weight: 8 }, { value: 'French', weight: 5 },
  { value: 'Mandarin', weight: 5 }, { value: 'Japanese', weight: 4 },
  { value: 'German', weight: 3 },
];

const LANG_TO_COUNTRY: Record<string, string> = {
  English: 'USA', Hindi: 'India', Spanish: 'Spain',
  French: 'France', Mandarin: 'China', Japanese: 'Japan', German: 'Germany',
};

const ADJECTIVES = [
  'Silent', 'Crimson', 'Hidden', 'Last', 'Endless', 'Frozen', 'Burning',
  'Forgotten', 'Eternal', 'Broken', 'Golden', 'Shattered', 'Wild', 'Quiet',
  'Distant', 'Sacred', 'Dark', 'Twilight', 'Velvet', 'Iron', 'Glass',
  'Hollow', 'Midnight', 'Whispered', 'Vanishing', 'Forbidden', 'Lonely',
  'Restless', 'Phantom', 'Bitter', 'Sweet', 'Wandering', 'Stolen',
];

const NOUNS = [
  'Echo', 'Shadow', 'River', 'City', 'Promise', 'Storm', 'Dream', 'Memory',
  'Garden', 'Mirror', 'Letter', 'Compass', 'Harbor', 'Empire', 'Kingdom',
  'Throne', 'Wolf', 'Phoenix', 'Crown', 'Lighthouse', 'Forest', 'Mountain',
  'Ocean', 'Desert', 'Bridge', 'Road', 'Train', 'Voyage', 'Horizon',
  'Compass', 'Symphony', 'Carnival', 'Cathedral', 'Heist', 'Verdict',
];

const NOUNS2 = [
  'the Lost Souls', 'the Forgotten', 'Tomorrow', 'Yesterday', 'the Wild',
  'the Nameless', 'the North', 'Solitude', 'the Damned', 'the Brave',
  'Glass', 'Iron', 'the Unknown', 'Silver', 'Smoke', 'Ashes', 'Stars',
];

const DESC_TEMPLATES = [
  'A {role} confronts {struggle} while uncovering a {secret} that threatens {stakes}.',
  'In {setting}, {role1} and {role2} must {action} before {deadline}.',
  'When {event} shatters their world, {role} embarks on a journey across {place}.',
  'A gripping tale of {theme1} and {theme2}, set against the backdrop of {setting}.',
  '{role} discovers that {twist}, forcing a final stand against {antagonist}.',
];

const DESC_FIELDS = {
  role: ['young detective', 'reluctant soldier', 'estranged sibling', 'aging artist', 'small-town doctor', 'street magician', 'former spy'],
  role1: ['two strangers', 'a mother and son', 'rival journalists', 'old friends', 'a teacher and student'],
  role2: ['a mysterious traveler', 'a hardened mercenary', 'an idealistic rookie', 'a dying patriarch'],
  struggle: ['a long-buried family curse', 'the collapse of an old empire', 'a wave of unexplained disappearances', 'their own fading memory'],
  secret: ['hidden treaty', 'lost heir', 'forbidden experiment', 'sacred relic'],
  stakes: ['an entire nation', 'their last chance at love', 'the balance of two worlds', 'all they hold dear'],
  setting: ['a crumbling coastal town', 'occupied 1940s Paris', 'a near-future Tokyo', 'a remote Himalayan monastery', 'colonial Bombay'],
  action: ['outwit a ruthless syndicate', 'finish what their father started', 'survive a single night', 'make peace with their past'],
  deadline: ['the eclipse fades', 'the festival begins', 'winter sets in', 'the borders close'],
  event: ['a single phone call', 'a shocking inheritance', 'an unexplained signal', 'a stolen photograph'],
  place: ['three war-torn continents', 'the haunted American South', 'snowbound Siberia', 'lawless border country'],
  theme1: ['betrayal', 'redemption', 'first love', 'sacrifice'],
  theme2: ['revolution', 'forgiveness', 'obsession', 'belonging'],
  twist: ['the killer was someone they trusted', 'the prophecy named them all along', 'their best friend was the spy', 'the city itself is alive'],
  antagonist: ['a ruthless corporate empire', 'an immortal warlord', 'their own reflection', 'a forgotten god'],
};

function fillTemplate(tmpl: string, fields: Record<string, string[]>): string {
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => rpick(fields[k as keyof typeof fields] ?? ['something']));
}

const REVIEW_POS = [
  'Absolutely captivating from start to finish. The performances are layered and the cinematography is stunning.',
  'A modern classic. I have not stopped thinking about the ending for days.',
  'Beautifully crafted and emotionally devastating in the best way possible.',
  'The pacing is perfect and every supporting character feels real.',
  'Easily one of the best films of its genre in recent memory.',
];
const REVIEW_MIX = [
  'Strong first half but the third act loses focus. Still worth watching for the lead performance.',
  'Visually impressive though the script could have been tighter.',
  'Has some genuinely brilliant moments scattered through an otherwise uneven film.',
  'A flawed but ambitious effort. Imperfect but memorable.',
];
const REVIEW_NEG = [
  'Beautifully shot but ultimately hollow. Style without substance.',
  'I wanted to love it but the dialogue kept pulling me out.',
  'A cold, slow film that mistakes confusion for depth.',
  'Promising premise wasted on a rambling screenplay.',
];

// ---------- Generators ----------
function generateGenres(): { genre_name: string; description: string }[] {
  return GENRES.map((g) => ({
    genre_name: g,
    description: `${g} films focus on themes typical of the ${g.toLowerCase()} genre.`,
  }));
}

function generateActorPool(count: number): string[] {
  const set = new Set<string>();
  while (set.size < count) {
    set.add(`${rpick(FIRST_NAMES)} ${rpick(LAST_NAMES)}`);
  }
  return Array.from(set);
}

function generateActors(names: string[]) {
  return names.map((name, i) => {
    const country = weightedPick(COUNTRIES_W);
    const birthYear = rint(1940, 2000);
    const birthMonth = rint(1, 12);
    const birthDay = rint(1, 28);
    return {
      actor_name: name,
      biography: `${name} is an acclaimed performer from ${country}, known for a versatile career spanning film and television. They began acting in the early ${Math.floor((birthYear + 20) / 10) * 10}s and have since become a recognized figure in international cinema.`,
      profile_image_url: `https://i.pravatar.cc/300?u=actor-${i + 1}`,
      birth_date: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
      country,
    };
  });
}

function generateMovieTitles(count: number): string[] {
  const set = new Set<string>();
  let attempts = 0;
  while (set.size < count && attempts < count * 10) {
    attempts++;
    const pattern = rng();
    let title: string;
    if (pattern < 0.4) {
      title = `${rpick(ADJECTIVES)} ${rpick(NOUNS)}`;
    } else if (pattern < 0.7) {
      title = `${rpick(NOUNS)} of ${rpick(NOUNS2)}`;
    } else if (pattern < 0.85) {
      title = `The ${rpick(ADJECTIVES)} ${rpick(NOUNS)}`;
    } else {
      title = `${rpick(NOUNS)} & ${rpick(NOUNS)}`;
    }
    set.add(title);
  }
  return Array.from(set);
}

function generateMovies(titles: string[], directorPool: string[]) {
  // Recent-weighted year
  const yearWeights: { value: number; weight: number }[] = [];
  for (let y = 1990; y <= 2024; y++) {
    yearWeights.push({ value: y, weight: 1 + (y - 1990) * 0.15 });
  }

  return titles.map((title, i) => {
    const year = weightedPick(yearWeights);
    const lang = weightedPick(LANG_W);
    const country = LANG_TO_COUNTRY[lang] ?? 'USA';
    const month = rint(1, 12);
    const day = rint(1, 28);
    return {
      title,
      description: fillTemplate(rpick(DESC_TEMPLATES), DESC_FIELDS),
      director: rpick(directorPool),
      release_year: year,
      release_date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      runtime: rint(90, 180),
      language: lang,
      country,
      rating_imdb: Number(clamp(rnorm(6.5, 1.2), 4.5, 9.5).toFixed(1)),
      poster_url: `https://picsum.photos/seed/movie-${i + 1}/400/600`,
      banner_url: `https://picsum.photos/seed/movie-banner-${i + 1}/1200/400`,
    };
  });
}

// ---------- DB helpers ----------
async function checkExisting(): Promise<number> {
  const { count, error } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Failed to query movies table. Did you run the schema migration?');
    console.error(error.message);
    process.exit(1);
  }
  return count ?? 0;
}

async function truncateAll() {
  console.log('  Wiping all seeded data (FK-safe order)…');
  // Each table is wiped by an always-true condition on its PK column.
  const wipes: { table: string; column: string; type: 'int' | 'uuid' }[] = [
    { table: 'watchlist',     column: 'watchlist_id', type: 'uuid' },
    { table: 'reviews',       column: 'review_id',    type: 'uuid' },
    { table: 'movie_actors',  column: 'movie_id',     type: 'int' },
    { table: 'movie_genres',  column: 'movie_id',     type: 'int' },
    { table: 'movies',        column: 'movie_id',     type: 'int' },
    { table: 'actors',        column: 'actor_id',     type: 'int' },
    { table: 'genres',        column: 'genre_id',     type: 'int' },
  ];
  for (const w of wipes) {
    const q = supabase.from(w.table).delete();
    const filtered = w.type === 'int'
      ? q.gte(w.column, 0)
      : q.not(w.column, 'is', null);
    const { error } = await filtered;
    if (error) {
      console.error(`  Failed to wipe ${w.table}: ${error.message}`);
      throw error;
    }
  }
  // Wipe seeded auth users (only those with @demo.movielib.local emails).
  const { data: usersList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersList?.users) {
    for (const u of usersList.users) {
      if (u.email?.endsWith('@demo.movielib.local')) {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }
  }
}

async function batchInsert<T>(table: string, rows: T[], chunk = 500) {
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase.from(table).insert(slice);
    if (error) {
      console.error(`Insert into ${table} failed at chunk ${i}:`, error.message);
      throw error;
    }
  }
}

async function createDemoUsers(count: number, actorNamePool: string[]): Promise<{ user_id: string; username: string }[]> {
  const created: { user_id: string; username: string }[] = [];
  const concurrency = 5;
  let idx = 0;

  async function worker() {
    while (idx < count) {
      const myIdx = idx++;
      const name = `${rpick(FIRST_NAMES)} ${rpick(LAST_NAMES)}`;
      const username = `demo_${myIdx + 1}`;
      const email = `${username}@demo.movielib.local`;
      const password = `Demo${myIdx + 1}!Secret#${rint(1000, 9999)}`;
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, username },
      });
      if (error) {
        console.error(`  Failed to create user ${username}: ${error.message}`);
        continue;
      }
      if (data?.user) {
        // Trigger creates public.users row; update username to deterministic value
        await supabase
          .from('users')
          .update({
            username,
            full_name: name,
            profile_image_url: `https://i.pravatar.cc/300?u=user-${myIdx + 1}`,
            bio: `Movie enthusiast and casual reviewer. Loves ${rpick(GENRES).toLowerCase()} films.`,
          })
          .eq('user_id', data.user.id);
        created.push({ user_id: data.user.id, username });
        if ((myIdx + 1) % 10 === 0) {
          console.log(`  ${myIdx + 1}/${count} users created`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return created;
}

function generateReviewText(rating: number): string {
  if (rating >= 8) return rpick(REVIEW_POS);
  if (rating >= 5.5) return rpick(REVIEW_MIX);
  return rpick(REVIEW_NEG);
}

// ---------- Main ----------
async function main() {
  console.log('🎬 Movie Library MIS — Phase 1 seed\n');

  const existing = await checkExisting();
  if (existing > 0 && !force) {
    console.log(`Movies table already has ${existing} rows. Skipping seed. Re-run with --force to wipe and reseed.`);
    return;
  }
  if (existing > 0 && force) {
    console.log(`Force flag set. Wiping existing data…`);
    await truncateAll();
  }

  // 1. Genres
  console.log('1/7 Inserting genres…');
  await batchInsert('genres', generateGenres());
  const { data: genresInserted } = await supabase.from('genres').select('genre_id');
  const genreIds = (genresInserted ?? []).map((g) => g.genre_id);

  // 2. Actors (150)
  console.log('2/7 Inserting 150 actors…');
  const actorNames = generateActorPool(150);
  await batchInsert('actors', generateActors(actorNames));
  const { data: actorsInserted } = await supabase.from('actors').select('actor_id, actor_name').order('actor_id');
  const actorRows = actorsInserted ?? [];

  // 3. Movies (250)
  console.log('3/7 Inserting 250 movies…');
  const titles = generateMovieTitles(250);
  if (titles.length < 250) {
    console.warn(`  Only generated ${titles.length} unique titles, continuing with that count`);
  }
  // Pick 30 directors from actor names so director field has variety
  const directorPool = rpickN(actorNames, 30);
  await batchInsert('movies', generateMovies(titles, directorPool));
  const { data: moviesInserted } = await supabase.from('movies').select('movie_id').order('movie_id');
  const movieIds = (moviesInserted ?? []).map((m) => m.movie_id);

  // 4. Movie-Genres
  console.log('4/7 Linking movie_genres…');
  const movieGenres: { movie_id: number; genre_id: number }[] = [];
  for (const movie_id of movieIds) {
    const n = rint(1, 4);
    for (const gid of rpickN(genreIds, n)) {
      movieGenres.push({ movie_id, genre_id: gid });
    }
  }
  await batchInsert('movie_genres', movieGenres);

  // 5. Movie-Actors
  console.log('5/7 Linking movie_actors…');
  const movieActors: { movie_id: number; actor_id: number; character_name: string; role_order: number }[] = [];
  for (const movie_id of movieIds) {
    const n = rint(8, 12);
    const cast = rpickN(actorRows, n);
    cast.forEach((a, idx) => {
      movieActors.push({
        movie_id,
        actor_id: a.actor_id,
        character_name: `${rpick(FIRST_NAMES)} ${rpick(LAST_NAMES)}`,
        role_order: idx,
      });
    });
  }
  await batchInsert('movie_actors', movieActors);

  // 6. Users (100 via auth admin)
  console.log('6/7 Creating 100 demo auth users (this takes ~30s)…');
  const users = await createDemoUsers(100, actorNames);
  if (users.length === 0) {
    console.error('No users created — cannot seed reviews. Check service-role key permissions.');
    return;
  }

  // 7. Reviews (300, unique movie+user)
  console.log('7/7 Inserting 300 reviews…');
  const reviewSet = new Set<string>();
  const reviews: { movie_id: number; user_id: string; rating: number; review_text: string; likes_count: number }[] = [];
  let attempts = 0;
  while (reviews.length < 300 && attempts < 5000) {
    attempts++;
    const m = rpick(movieIds);
    const u = rpick(users);
    const key = `${m}-${u.user_id}`;
    if (reviewSet.has(key)) continue;
    reviewSet.add(key);
    // NB: reviews.rating is NUMERIC(2,1) — max storable value is 9.9, even
    // though the CHECK constraint loosely allows up to 10. Clamp accordingly.
    const rating = Number(clamp(rnorm(7, 1.5), 1, 9.9).toFixed(1));
    reviews.push({
      movie_id: m,
      user_id: u.user_id,
      rating,
      review_text: generateReviewText(rating),
      likes_count: rint(0, 50),
    });
  }
  await batchInsert('reviews', reviews);

  // Summary
  console.log('\n✅ Seed complete:');
  console.log(`   Genres:        ${GENRES.length}`);
  console.log(`   Actors:        ${actorRows.length}`);
  console.log(`   Movies:        ${movieIds.length}`);
  console.log(`   Movie-Genres:  ${movieGenres.length}`);
  console.log(`   Movie-Actors:  ${movieActors.length}`);
  console.log(`   Users:         ${users.length}`);
  console.log(`   Reviews:       ${reviews.length}`);
  console.log('\nReady. Run: npm run dev');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
