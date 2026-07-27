# MongoDB + Mongoose in Node.js — A Complete Playbook

A hands-on, example-driven guide that takes you from "what even is MongoDB" all
the way to building a full CRUD API with Mongoose in Node.js. Every example uses
one consistent theme — an **anime** collection — so concepts build on each other
instead of resetting each section.

> **Versions this playbook targets**
> - MongoDB 6.x / 7.x (via the `mongosh` shell)
> - Mongoose `^9.8` (the version in this repo's `package.json`)
> - Node.js `>=20.19` (required by Mongoose 9)
>
> Mongoose 9 is **promises-only** — the old `callback` style (`Model.find(query, (err, docs) => {})`)
> was removed in Mongoose 7. Everything here uses `async/await`.

---

## Table of Contents

1. [What is MongoDB?](#1-what-is-mongodb)
2. [Core Terminology](#2-core-terminology)
3. [MongoDB Shell Syntax (`mongosh`)](#3-mongodb-shell-syntax-mongosh)
   - [Insert](#31-insert)
   - [Read / Query](#32-read--query)
   - [Query Operators](#33-query-operators)
   - [Projection, Sort, Limit, Skip](#34-projection-sort-limit-skip)
   - [Update](#35-update)
   - [Update Operators](#36-update-operators)
   - [Delete](#37-delete)
   - [Indexes](#38-indexes)
   - [Aggregation Basics](#39-aggregation-basics)
4. [What is Mongoose (and why use it)?](#4-what-is-mongoose-and-why-use-it)
5. [Setup in Node.js](#5-setup-in-nodejs)
6. [Schemas](#6-schemas)
7. [Models](#7-models)
8. [The Popular Methods — What They Do & What They Return](#8-the-popular-methods--what-they-do--what-they-return)
   - [Create](#81-create)
   - [Read](#82-read)
   - [Query Building & Chaining](#83-query-building--chaining)
   - [Update](#84-update)
   - [Delete](#85-delete)
   - [Counting & Existence](#86-counting--existence)
9. [Validation & Error Handling](#9-validation--error-handling)
10. [Relationships & `populate()`](#10-relationships--populate)
11. [Middleware (Hooks)](#11-middleware-hooks)
12. [Virtuals, Instance Methods & Statics](#12-virtuals-instance-methods--statics)
13. [Indexes in Mongoose](#13-indexes-in-mongoose)
14. [Aggregation in Mongoose](#14-aggregation-in-mongoose)
15. [Complete Working Example (Express CRUD API)](#15-complete-working-example-express-crud-api)
16. [Return-Value Cheat Sheet](#16-return-value-cheat-sheet)
17. [Best Practices & Common Pitfalls](#17-best-practices--common-pitfalls)

---

## 1. What is MongoDB?

**MongoDB** is a **document-oriented NoSQL database**. Instead of storing data in
tables of rows and columns (like MySQL or PostgreSQL), it stores **documents** —
flexible, JSON-like objects — grouped into **collections**.

A single document looks like this:

```json
{
  "_id": "6512a1f4e13b2c0012a3b4c5",
  "title": "Naruto",
  "genre": "Action",
  "episodes": 220,
  "rating": 8.3,
  "studios": ["Pierrot"],
  "airedFrom": "2002-10-03T00:00:00.000Z"
}
```

### Relational vs. Document — the mental model

| Relational (SQL) | MongoDB          |
| ---------------- | ---------------- |
| Database         | Database         |
| Table            | Collection       |
| Row              | Document         |
| Column           | Field            |
| JOIN             | Embedding / `$lookup` / `populate()` |
| Fixed schema     | Flexible schema  |

### Key characteristics

- **Documents are BSON.** On disk MongoDB stores **BSON** (Binary JSON), which
  adds types JSON lacks: `ObjectId`, `Date`, `Decimal128`, `Binary`, `Int32`,
  `Long`, etc.
- **Flexible schema.** Two documents in the same collection don't need identical
  fields. One anime can have a `studios` array; another can omit it entirely.
- **`_id` is automatic.** Every document gets a unique primary key `_id`. If you
  don't supply one, MongoDB generates a 12-byte `ObjectId`.
- **Horizontal scaling.** Built for sharding (spreading data across machines).

### When MongoDB fits well

- Rapidly evolving schemas / early-stage products.
- Hierarchical or nested data that maps naturally to objects (a post with its
  comments, an anime with its episode list).
- High write throughput and horizontal scale.

### When to think twice

- Heavy multi-entity transactions and complex JOINs across many tables (a
  well-normalized relational DB may serve you better). MongoDB *does* support
  multi-document ACID transactions, but they're the exception, not the norm.

---

## 2. Core Terminology

| Term          | Meaning |
| ------------- | ------- |
| **Database**  | A container for collections. A MongoDB server hosts many databases. |
| **Collection**| A group of documents (≈ a table). Created lazily on first insert. |
| **Document**  | A single BSON record (≈ a row), max 16 MB. |
| **Field**     | A key/value pair inside a document (≈ a column). |
| **`_id`**     | The mandatory primary key. Unique per collection. |
| **`ObjectId`**| Default `_id` type — a 12-byte id that also encodes a creation timestamp. |
| **BSON**      | The binary format MongoDB uses to store documents. |
| **Index**     | A data structure that speeds up queries (like a book index). |
| **Aggregation Pipeline** | A staged data-processing framework (`$match`, `$group`, `$sort`, …) for analytics-style queries. |

---

## 3. MongoDB Shell Syntax (`mongosh`)

Before Mongoose, it helps to see the **raw** MongoDB query language. This is what
Mongoose ultimately sends to the server. You run these in `mongosh` (the official
shell) or in MongoDB Compass's query bar.

```js
// Start the shell and pick a database (created lazily on first write)
mongosh
use animes            // switch to (or create) the "animes" database
show collections      // list collections in the current db
```

All CRUD lives on a collection accessed via `db.<collection>`, e.g. `db.anime`.

### 3.1 Insert

```js
// Insert a single document -> returns { acknowledged, insertedId }
db.anime.insertOne({
  title: "Naruto",
  genre: "Action",
  episodes: 220,
  rating: 8.3
})

// Insert many -> returns { acknowledged, insertedIds: { 0: ..., 1: ... } }
db.anime.insertMany([
  { title: "One Piece", genre: "Adventure", episodes: 1000, rating: 8.7 },
  { title: "Death Note", genre: "Thriller", episodes: 37,  rating: 9.0 }
])
```

### 3.2 Read / Query

```js
db.anime.find()                          // all documents (a cursor)
db.anime.find({ genre: "Action" })       // filter by equality
db.anime.findOne({ title: "Naruto" })    // the first match, or null
db.anime.find({ rating: { $gte: 9 } })   // ratings >= 9
db.anime.countDocuments({ genre: "Action" })  // -> a number
```

`find()` returns a **cursor** (iterable, prints the first batch).
`findOne()` returns **a single document or `null`**.

### 3.3 Query Operators

Operators go **inside the field's value object**. `{ rating: { $gte: 9 } }` reads
as "the `rating` field is `>= 9`".

| Operator  | Meaning                        | Example |
| --------- | ------------------------------ | ------- |
| `$eq`     | equals                         | `{ genre: { $eq: "Action" } }` |
| `$ne`     | not equals                     | `{ genre: { $ne: "Action" } }` |
| `$gt` `$gte` | greater than / or equal     | `{ episodes: { $gt: 100 } }` |
| `$lt` `$lte` | less than / or equal        | `{ rating: { $lte: 7 } }` |
| `$in`     | matches any value in an array  | `{ genre: { $in: ["Action", "Adventure"] } }` |
| `$nin`    | matches none in an array       | `{ genre: { $nin: ["Ecchi"] } }` |
| `$exists` | field is present / absent      | `{ studios: { $exists: true } }` |
| `$regex`  | pattern match                  | `{ title: { $regex: /^Nar/i } }` |
| `$and`    | all conditions true            | `{ $and: [ { rating: { $gte: 8 } }, { episodes: { $lt: 50 } } ] }` |
| `$or`     | any condition true             | `{ $or: [ { genre: "Action" }, { rating: { $gte: 9 } } ] }` |
| `$not`    | negates a condition            | `{ rating: { $not: { $lt: 8 } } }` |

### 3.4 Projection, Sort, Limit, Skip

```js
// Projection: 1 = include, 0 = exclude. (_id is included unless you set 0.)
db.anime.find({ genre: "Action" }, { title: 1, rating: 1, _id: 0 })

// Chain cursor modifiers (order doesn't matter; they build one query)
db.anime.find()
  .sort({ rating: -1 })   // -1 desc, 1 asc
  .skip(10)               // skip the first 10 (pagination)
  .limit(5)               // return at most 5
```

### 3.5 Update

```js
// Update the FIRST match -> { acknowledged, matchedCount, modifiedCount, upsertedCount, upsertedId }
db.anime.updateOne(
  { title: "Naruto" },
  { $set: { rating: 8.4 } }
)

// Update ALL matches
db.anime.updateMany(
  { genre: "Action" },
  { $inc: { rating: 0.1 } }
)

// Upsert: update if found, otherwise insert
db.anime.updateOne(
  { title: "Bleach" },
  { $set: { genre: "Action", episodes: 366 } },
  { upsert: true }
)
```

> ⚠️ A raw update **must** use update operators (`$set`, `$inc`, …). Passing a
> plain object (`{ rating: 8.4 }`) would **replace the whole document**.

### 3.6 Update Operators

| Operator   | Meaning | Example |
| ---------- | ------- | ------- |
| `$set`     | set a field's value          | `{ $set: { rating: 8.5 } }` |
| `$unset`   | remove a field               | `{ $unset: { studios: "" } }` |
| `$inc`     | increment (negative = decrement) | `{ $inc: { episodes: 1 } }` |
| `$mul`     | multiply                     | `{ $mul: { rating: 1.1 } }` |
| `$rename`  | rename a field               | `{ $rename: { "genre": "category" } }` |
| `$push`    | append to an array           | `{ $push: { studios: "Bones" } }` |
| `$addToSet`| append only if not present   | `{ $addToSet: { studios: "Pierrot" } }` |
| `$pull`    | remove matching array items  | `{ $pull: { studios: "Bones" } }` |
| `$pop`     | remove first (`-1`) / last (`1`) | `{ $pop: { studios: 1 } }` |

### 3.7 Delete

```js
// -> { acknowledged, deletedCount }
db.anime.deleteOne({ title: "Death Note" })
db.anime.deleteMany({ rating: { $lt: 6 } })
```

### 3.8 Indexes

```js
db.anime.createIndex({ title: 1 })                 // ascending index on title
db.anime.createIndex({ title: 1 }, { unique: true })  // enforce uniqueness
db.anime.createIndex({ genre: 1, rating: -1 })     // compound index
db.anime.getIndexes()                              // list indexes
```

Indexes make matching/sorting on those fields fast. Without one, MongoDB scans
every document (a "collection scan").

### 3.9 Aggregation Basics

The aggregation pipeline runs documents through ordered **stages**:

```js
// Average rating per genre, highest first
db.anime.aggregate([
  { $match: { episodes: { $gt: 12 } } },        // 1. filter
  { $group: { _id: "$genre", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }, // 2. group
  { $sort: { avgRating: -1 } }                  // 3. sort
])
```

Common stages: `$match` (filter), `$group` (aggregate), `$sort`, `$project`
(reshape), `$limit`, `$skip`, `$lookup` (join another collection), `$unwind`
(flatten an array).

---

## 4. What is Mongoose (and why use it)?

Writing raw MongoDB queries in Node.js works, but it's easy to save malformed
data — nothing stops you from inserting an anime with `rating: "very good"` or
no `title` at all.

**Mongoose** is an **ODM** (Object Data Modeling library) for MongoDB in Node.js.
It sits between your code and the database and gives you:

- **Schemas** — a blueprint that defines the shape, types, and rules of your
  documents.
- **Models** — a constructor built from a schema that you use to create, query,
  update, and delete documents.
- **Validation** — reject bad data *before* it reaches the database.
- **Middleware (hooks)** — run logic before/after saves, deletes, queries.
- **Type casting** — the string `"220"` becomes the number `220` if the field is
  `Number`.
- **Query helpers, virtuals, population** (JOIN-like references), and more.

Think of it as: **MongoDB = the warehouse; Mongoose = the clipboard, rules, and
forms that keep the warehouse tidy.**

---

## 5. Setup in Node.js

```bash
npm install mongoose
```

### Connecting

Mongoose 9's `connect()` returns a **promise**. None of the legacy options
(`useNewUrlParser`, `useUnifiedTopology`, `useCreateIndex`, `useFindAndModify`)
are needed anymore — they were removed in Mongoose 6.

```js
const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/animes');
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // fail fast — the app is useless without the DB
  }
}

connectDB();
```

In real projects, keep the URI in an environment variable (this repo already
depends on `dotenv`):

```js
// .env  ->  MONGO_URI=mongodb://localhost:27017/animes
require('dotenv').config();
await mongoose.connect(process.env.MONGO_URI);
```

### Listening to connection events (optional but handy)

```js
mongoose.connection.on('connected',    () => console.log('Mongoose connected'));
mongoose.connection.on('error',   (e) => console.error('Mongoose error', e));
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));
```

> **Connect once, at startup.** `mongoose.connect()` manages an internal
> connection pool. Do **not** call it per request.

---

## 6. Schemas

A **schema** defines the structure and rules of documents in a collection.

```js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const animeSchema = new Schema(
  {
    title:    { type: String, required: true, trim: true, unique: true },
    genre:    { type: String, required: true, enum: ['Action', 'Adventure', 'Thriller', 'Comedy', 'Drama'] },
    episodes: { type: Number, required: true, min: 1 },
    rating:   { type: Number, min: 0, max: 10, default: 0 },
    isAiring: { type: Boolean, default: false },
    studios:  { type: [String], default: [] },          // array of strings
    airedFrom:{ type: Date },
    meta: {                                              // nested object
      views: { type: Number, default: 0 },
    },
  },
  { timestamps: true } // auto-adds createdAt & updatedAt
);
```

> **Note:** the class is `mongoose.Schema` (not `Schmea` — a typo worth
> watching for; see [§17](#17-best-practices--common-pitfalls)).

### SchemaType options you'll use constantly

| Option      | Applies to | What it does |
| ----------- | ---------- | ------------ |
| `type`      | all        | The BSON type: `String`, `Number`, `Boolean`, `Date`, `Buffer`, `Schema.Types.ObjectId`, `Schema.Types.Mixed`, arrays `[Type]`. |
| `required`  | all        | Field must be present. Can be `[true, 'custom message']`. |
| `default`   | all        | Value (or function) used when none is provided. |
| `unique`    | all        | Creates a **unique index** (not a validator — see pitfalls). |
| `enum`      | String/Number | Restrict to a set of allowed values. |
| `min`/`max` | Number/Date | Range validation. |
| `minlength`/`maxlength` | String | Length validation. |
| `match`     | String     | Regex the value must match. |
| `trim`, `lowercase`, `uppercase` | String | Normalization applied on set. |
| `validate`  | all        | Custom validator function or `{ validator, message }`. |

### Custom validation example

```js
rating: {
  type: Number,
  validate: {
    validator: (v) => v >= 0 && v <= 10,
    message: (props) => `${props.value} is not a valid rating (0–10)`,
  },
}
```

---

## 7. Models

A **model** is a constructor compiled from a schema. You do all your database
work through the model.

```js
const Anime = mongoose.model('Anime', animeSchema);
module.exports = Anime;
```

### The pluralization rule (a classic surprise)

`mongoose.model('Anime', schema)` maps to the collection **`animes`** —
Mongoose lowercases the model name and pluralizes it. To pin a specific
collection name, pass it as the schema's third option:

```js
const Anime = mongoose.model('Anime', animeSchema, 'anime'); // exact collection: "anime"
```

An instance of a model is a **document**:

```js
const doc = new Anime({ title: 'Naruto', genre: 'Action', episodes: 220 });
console.log(doc instanceof Anime);         // true
console.log(doc._id);                      // ObjectId already assigned (before save)
```

---

## 8. The Popular Methods — What They Do & What They Return

This is the reference section. For each method: **signature → what it does →
what it returns → example.** Assume `const Anime = require('./models/anime')`.

> Most query methods return a **Mongoose `Query`**, which is *thenable* — you can
> `await` it directly, or chain helpers (`.sort()`, `.select()`, …) and `await`
> at the end. `Model.create()` / `doc.save()` return real **Promises**.

### 8.1 Create

#### `new Model(obj)` + `doc.save()`

- **Does:** builds a document in memory, then persists it. Runs validation and
  `save` middleware.
- **Returns:** `save()` → a `Promise` resolving to the **saved document** (with
  `_id`, `createdAt`, etc.).

```js
const anime = new Anime({ title: 'Naruto', genre: 'Action', episodes: 220 });
const saved = await anime.save();
console.log(saved._id, saved.createdAt); // populated by MongoDB / timestamps
```

#### `Model.create(doc | [docs] | ...docs)`

- **Does:** shorthand for `new Model()` + `save()`, for one or many docs.
- **Returns:** a `Promise`. **The shape mirrors the input:**
  - `create(obj)` → **a single document**
  - `create([obj1, obj2])` → **an array of documents**
  - `create()` (no args) → `null`

```js
const one = await Anime.create({ title: 'Bleach', genre: 'Action', episodes: 366 });
// one -> a document

const many = await Anime.create([
  { title: 'One Piece', genre: 'Adventure', episodes: 1000 },
  { title: 'Death Note', genre: 'Thriller', episodes: 37 },
]);
// many -> [document, document]
```

#### `Model.insertMany(docs, [options])`

- **Does:** inserts many docs in **one** bulk operation — faster than looping
  `create()`. By default validates but does **not** run `save` middleware.
- **Returns:** a `Promise` resolving to an **array of inserted documents**.

```js
const inserted = await Anime.insertMany([
  { title: 'Bleach', genre: 'Action', episodes: 366 },
  { title: 'Trigun', genre: 'Action', episodes: 26 },
]);
console.log(inserted.length); // 2
```

### 8.2 Read

#### `Model.find(filter, [projection], [options])`

- **Does:** finds **all** documents matching `filter` (`{}` = everything).
- **Returns:** a `Query` resolving to an **array of documents** — **`[]` when
  nothing matches** (never `null`).

```js
const all      = await Anime.find();                       // every anime
const action   = await Anime.find({ genre: 'Action' });    // filtered
const topRated = await Anime.find({ rating: { $gte: 9 } }); // with operators
```

#### `Model.findOne(filter, [projection], [options])`

- **Does:** finds the **first** document matching `filter`.
- **Returns:** a `Query` resolving to **a single document, or `null`**.

```js
const naruto = await Anime.findOne({ title: 'Naruto' });
if (!naruto) console.log('Not found');
```

#### `Model.findById(id, [projection], [options])`

- **Does:** convenience for `findOne({ _id: id })`.
- **Returns:** a `Query` resolving to **a single document, or `null`**.

```js
const anime = await Anime.findById('6512a1f4e13b2c0012a3b4c5');
```

### 8.3 Query Building & Chaining

Because reads return a `Query`, you can build it up fluently and `await` once at
the end. The database isn't hit until the query is awaited/executed.

```js
const results = await Anime
  .find({ genre: 'Action' })   // filter
  .select('title rating -_id') // projection: include title & rating, drop _id
  .sort({ rating: -1 })        // -1 desc, 1 asc (or '-rating')
  .skip(10)                    // pagination offset
  .limit(5)                    // page size
  .lean();                     // return plain JS objects (see below)
```

| Chainable helper | What it does | Returns |
| ---------------- | ------------ | ------- |
| `.select(fields)` | choose fields (`'a b -c'` or `{ a: 1 }`) | the `Query` |
| `.sort(spec)`     | order results | the `Query` |
| `.limit(n)`       | cap result count | the `Query` |
| `.skip(n)`        | skip N docs (pagination) | the `Query` |
| `.where('f').gte(9)` | fluent condition builder | the `Query` |
| `.populate('ref')` | replace refs with documents ([§10](#10-relationships--populate)) | the `Query` |
| `.lean()`         | return **plain objects** instead of Mongoose documents | the `Query` |

> **`.lean()` matters.** Normal queries return full Mongoose documents (with
> `.save()`, virtuals, getters — heavier). `.lean()` returns raw POJOs: much
> faster and lighter, ideal for **read-only** endpoints where you won't modify
> and re-save the result.

### 8.4 Update

#### `Model.updateOne(filter, update, [options])` / `Model.updateMany(...)`

- **Does:** updates the first / all matching document(s) directly in the DB.
- **Returns:** a `Query` resolving to a **result object**, *not* the document:
  `{ acknowledged, matchedCount, modifiedCount, upsertedCount, upsertedId }`.

```js
const res = await Anime.updateOne({ title: 'Naruto' }, { $set: { rating: 8.4 } });
console.log(res.modifiedCount); // 1 if it changed, 0 if not found / unchanged

await Anime.updateMany({ genre: 'Action' }, { $inc: { rating: 0.1 } });
```

#### `Model.findByIdAndUpdate(id, update, [options])` / `Model.findOneAndUpdate(filter, update, [options])`

- **Does:** finds one doc and updates it **in a single atomic operation**.
- **Returns:** a `Query` resolving to **the document**. ⚠️ **By default it returns
  the document as it was *before* the update.** Pass `{ new: true }` (modern
  alias: `{ returnDocument: 'after' }`) to get the updated version.

```js
const updated = await Anime.findByIdAndUpdate(
  id,
  { $set: { rating: 9.1 } },
  { new: true, runValidators: true } // return the UPDATED doc + enforce schema rules
);
```

**Important options:**
- `new: true` → return the post-update document (default is pre-update).
- `runValidators: true` → apply schema validation to the update (**off by
  default** for update methods!).
- `upsert: true` → create the doc if no match exists.

#### Modify a fetched document, then `save()`

Best when you need middleware/validation to run on real document instances:

```js
const anime = await Anime.findById(id);
anime.rating = 9.2;
anime.studios.push('Studio Pierrot');
await anime.save(); // validates + runs save hooks
```

### 8.5 Delete

#### `Model.deleteOne(filter)` / `Model.deleteMany(filter)`

- **Does:** deletes the first / all matching document(s).
- **Returns:** a `Query` resolving to `{ acknowledged, deletedCount }`.

```js
const res = await Anime.deleteOne({ title: 'Trigun' });
console.log(res.deletedCount); // 1 or 0

await Anime.deleteMany({ rating: { $lt: 6 } });
```

#### `Model.findByIdAndDelete(id)` / `Model.findOneAndDelete(filter)`

- **Does:** deletes one doc and hands it back to you.
- **Returns:** a `Query` resolving to **the deleted document, or `null`**.

```js
const removed = await Anime.findByIdAndDelete(id);
if (removed) console.log(`Deleted ${removed.title}`);
```

> The old `Model.remove()` / `doc.remove()` were **removed in Mongoose 7**. Use
> `deleteOne` / `deleteMany` (or `doc.deleteOne()` on an instance).

### 8.6 Counting & Existence

#### `Model.countDocuments(filter)`

- **Does:** counts documents matching `filter` (accurate; runs a real query).
- **Returns:** a `Query` resolving to a **number**.

```js
const total = await Anime.countDocuments();
const actionCount = await Anime.countDocuments({ genre: 'Action' });
```

#### `Model.estimatedDocumentCount()`

- **Does:** fast total using collection metadata — **ignores any filter**.
- **Returns:** a `Query` resolving to a **number**. Use for "how many docs total"
  on huge collections where speed beats exactness.

#### `Model.distinct(field, [filter])`

- **Does:** returns the unique values of a field.
- **Returns:** a `Query` resolving to an **array**.

```js
const genres = await Anime.distinct('genre'); // e.g. ['Action', 'Adventure', ...]
```

#### `Model.exists(filter)`

- **Does:** checks whether a matching doc exists.
- **Returns:** a `Query` resolving to **`{ _id }` if found, or `null`** — **not a
  boolean** (a common gotcha; changed in Mongoose 6). Coerce it yourself:

```js
const found = await Anime.exists({ title: 'Naruto' });
if (found) console.log('exists, id =', found._id); // truthy check works fine
```

---

## 9. Validation & Error Handling

Validation runs automatically on `save()`, `create()`, and `insertMany()`. For
**update** methods you must opt in with `runValidators: true`.

```js
try {
  await Anime.create({ genre: 'Action' }); // missing required `title` & `episodes`
} catch (err) {
  if (err.name === 'ValidationError') {
    // err.errors is keyed by field
    for (const field in err.errors) {
      console.log(`${field}: ${err.errors[field].message}`);
    }
  } else {
    throw err;
  }
}
```

Errors you'll meet often:

| Error `name` / code | Cause |
| ------------------- | ----- |
| `ValidationError`   | Failed a schema rule (`required`, `enum`, `min`, custom validator). |
| `CastError`         | A value couldn't be cast to the field's type (e.g. `"abc"` into a `Number`, or a bad `ObjectId`). |
| Duplicate key `E11000` (`err.code === 11000`) | Violated a `unique` index. |

---

## 10. Relationships & `populate()`

MongoDB doesn't do SQL JOINs, but Mongoose can **reference** documents in another
collection and swap the id for the full document on read — that's `populate()`.

```js
const studioSchema = new Schema({ name: String, country: String });
const Studio = mongoose.model('Studio', studioSchema);

const animeSchema = new Schema({
  title: String,
  studio: { type: Schema.Types.ObjectId, ref: 'Studio' }, // reference by _id
});
const Anime = mongoose.model('Anime', animeSchema);
```

```js
// Store only the id...
const bones = await Studio.create({ name: 'Bones', country: 'Japan' });
await Anime.create({ title: 'Mob Psycho 100', studio: bones._id });

// ...then hydrate it on read
const anime = await Anime.findOne({ title: 'Mob Psycho 100' }).populate('studio');
console.log(anime.studio.name);    // 'Bones'  <- the full document, not just the id
console.log(anime.studio.country); // 'Japan'
```

You can populate multiple paths, select specific fields, and populate nested
refs:

```js
await Anime.find()
  .populate({ path: 'studio', select: 'name -_id' });
```

**Embed vs. reference:** embed data that's read together and rarely shared
(episode list inside an anime); reference data that's shared or grows unbounded
(a studio referenced by many anime).

---

## 11. Middleware (Hooks)

Middleware are functions that run **before (`pre`)** or **after (`post`)** an
event — great for logging, derived fields, cascading deletes, etc.

```js
// Runs before every save() (and create(), which calls save under the hood)
animeSchema.pre('save', function (next) {
  this.title = this.title.trim();
  console.log(`About to save: ${this.title}`);
  next();
});

// Runs after a document is saved
animeSchema.post('save', function (doc) {
  console.log(`Saved anime ${doc._id}`);
});

// Query middleware: exclude soft-deleted docs from every find()
animeSchema.pre(/^find/, function (next) {
  this.where({ deleted: { $ne: true } });
  next();
});
```

> In **document** hooks (`save`), `this` is the document. In **query** hooks
> (`find`, `updateOne`, …), `this` is the query. Define hooks **before** you call
> `mongoose.model()`.

---

## 12. Virtuals, Instance Methods & Statics

```js
// VIRTUAL — a computed property that is NOT stored in MongoDB
animeSchema.virtual('summary').get(function () {
  return `${this.title} (${this.episodes} eps) — ${this.rating}/10`;
});

// INSTANCE METHOD — called on a document
animeSchema.methods.isLongRunning = function () {
  return this.episodes > 100;
};

// STATIC METHOD — called on the Model
animeSchema.statics.findByGenre = function (genre) {
  return this.find({ genre });
};
```

```js
const anime = await Anime.findOne({ title: 'One Piece' });
console.log(anime.summary);            // virtual getter
console.log(anime.isLongRunning());    // true

const action = await Anime.findByGenre('Action'); // static
```

> Virtuals are excluded from `JSON.stringify`/`res.json()` by default. Enable them
> with `new Schema({...}, { toJSON: { virtuals: true } })`.

---

## 13. Indexes in Mongoose

Declare indexes in the schema and Mongoose builds them on startup.

```js
animeSchema.index({ title: 1 }, { unique: true });   // unique index
animeSchema.index({ genre: 1, rating: -1 });          // compound index

// Field-level shorthand also creates an index:
title: { type: String, unique: true, index: true }
```

> **`unique` is an index, not a validator.** If a duplicate slips in you get a
> MongoDB `E11000` error at write time — not a Mongoose `ValidationError`. Handle
> `err.code === 11000` explicitly.
>
> **Production tip:** auto-index building is convenient in dev but expensive on
> large collections. Disable it (`autoIndex: false`) in production and build
> indexes deliberately.

---

## 14. Aggregation in Mongoose

`Model.aggregate(pipeline)` runs the raw MongoDB aggregation pipeline and returns
a `Promise` resolving to an **array of plain objects** (not Mongoose documents).

```js
const stats = await Anime.aggregate([
  { $match: { episodes: { $gte: 12 } } },
  { $group: {
      _id: '$genre',
      avgRating: { $avg: '$rating' },
      count: { $sum: 1 },
  }},
  { $sort: { avgRating: -1 } },
]);
// -> [ { _id: 'Thriller', avgRating: 9.0, count: 1 }, ... ]
```

---

## 15. Complete Working Example (Express CRUD API)

A minimal but complete, **runnable** Express + Mongoose API tying it all
together. (This is a corrected, working counterpart to this repo's `app.js`.)

```js
// app.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// ---- Schema & Model -------------------------------------------------------
const { Schema } = mongoose;
const animeSchema = new Schema(
  {
    title:    { type: String, required: true, trim: true, unique: true },
    genre:    { type: String, required: true },
    episodes: { type: Number, required: true, min: 1 },
    rating:   { type: Number, min: 0, max: 10, default: 0 },
  },
  { timestamps: true }
);
const Anime = mongoose.model('Anime', animeSchema);

// ---- Routes (CRUD) --------------------------------------------------------

// CREATE
app.post('/anime', async (req, res) => {
  try {
    const anime = await Anime.create(req.body);
    res.status(201).json(anime);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ (list, with optional ?genre= filter)
app.get('/anime', async (req, res) => {
  const filter = req.query.genre ? { genre: req.query.genre } : {};
  const anime = await Anime.find(filter).sort({ rating: -1 }).lean();
  res.json(anime);
});

// READ (one)
app.get('/anime/:id', async (req, res) => {
  try {
    const anime = await Anime.findById(req.params.id);
    if (!anime) return res.status(404).json({ error: 'Not found' });
    res.json(anime);
  } catch (err) {
    res.status(400).json({ error: 'Invalid id' }); // CastError
  }
});

// UPDATE
app.patch('/anime/:id', async (req, res) => {
  try {
    const anime = await Anime.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!anime) return res.status(404).json({ error: 'Not found' });
    res.json(anime);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
app.delete('/anime/:id', async (req, res) => {
  const anime = await Anime.findByIdAndDelete(req.params.id);
  if (!anime) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: anime.title });
});

// ---- Boot: connect FIRST, then listen ------------------------------------
async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/animes');
    console.log('✅ Connected to MongoDB');
    app.listen(3000, () => console.log('🚀 API on http://localhost:3000'));
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
}
start();
```

Try it:

```bash
# Create
curl -X POST http://localhost:3000/anime \
  -H "Content-Type: application/json" \
  -d '{"title":"Naruto","genre":"Action","episodes":220,"rating":8.3}'

# List
curl http://localhost:3000/anime

# List by genre
curl "http://localhost:3000/anime?genre=Action"
```

---

## 16. Return-Value Cheat Sheet

| Method | Resolves to | Not-found value |
| ------ | ----------- | --------------- |
| `doc.save()` | the saved document | — |
| `create(obj)` | a document | — |
| `create([...])` | array of documents | — |
| `insertMany([...])` | array of documents | — |
| `find(filter)` | **array** of documents | `[]` |
| `findOne(filter)` | one document | `null` |
| `findById(id)` | one document | `null` |
| `updateOne` / `updateMany` | `{ acknowledged, matchedCount, modifiedCount, upsertedCount, upsertedId }` | `matchedCount: 0` |
| `findByIdAndUpdate` / `findOneAndUpdate` | the document (**old** unless `{ new: true }`) | `null` |
| `deleteOne` / `deleteMany` | `{ acknowledged, deletedCount }` | `deletedCount: 0` |
| `findByIdAndDelete` / `findOneAndDelete` | the deleted document | `null` |
| `countDocuments(filter)` | a number | `0` |
| `estimatedDocumentCount()` | a number (ignores filter) | `0` |
| `distinct(field)` | array of unique values | `[]` |
| `exists(filter)` | `{ _id }` | `null` |
| `aggregate(pipeline)` | array of plain objects | `[]` |

---

## 17. Best Practices & Common Pitfalls

**Do**
- ✅ Connect **once** at startup and reuse the pooled connection.
- ✅ Wrap DB calls in `try/catch` (or async error middleware) — network and
  validation errors are normal.
- ✅ Use `.lean()` for read-only endpoints — big performance win.
- ✅ Pass `{ new: true, runValidators: true }` to `findByIdAndUpdate` when you
  want the updated doc **and** schema enforcement.
- ✅ Index the fields you filter/sort on frequently.
- ✅ Keep the connection URI in `.env` (already git-ignored in this repo).

**Watch out for**
- ⚠️ **Typos in core names.** `mongoose.Schema` (not `Schmea`) and `const`/`new`
  keywords — a typo here throws at import time. *(This repo's current `app.js`
  contains exactly these: `Schmea`, `cont Anime`, and it references `Anime`
  in a route before the model is defined — see the corrected version in
  [§15](#15-complete-working-example-express-crud-api).)*
- ⚠️ **`exists()` returns `{ _id }` or `null`, not `true`/`false`.**
- ⚠️ **`findByIdAndUpdate` returns the OLD document by default** — add
  `{ new: true }`.
- ⚠️ **Update validators are off by default** — add `runValidators: true`.
- ⚠️ **`unique` is an index, not a validator** — duplicates throw `E11000`, not
  a `ValidationError`.
- ⚠️ **Raw update needs operators.** `updateOne(filter, { rating: 9 })` replaces
  fields via `$set` in Mongoose, but in the raw driver a plain object replaces
  the whole document. Prefer explicit `{ $set: { ... } }`.
- ⚠️ **Callbacks are gone (Mongoose 7+).** Everything is promises/async-await.
- ⚠️ **`remove()`, `update()`, `count()` are removed/deprecated** — use
  `deleteOne`/`deleteMany`, `updateOne`/`updateMany`, `countDocuments`.

---

*Happy hacking. Clone, run a local MongoDB (`mongod`) or point `MONGO_URI` at
MongoDB Atlas, and start building.*
