require('dotenv/config');
const express = require('express');
const staticMiddleware = require('./static-middleware');
const errorMiddleware = require('./error-middleware');
const ClientError = require('./client-error');
const pg = require('pg');

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const app = express();

app.use(express.json());
app.use(staticMiddleware);

app.get('/api/hello', (req, res) => {
  res.json({ hello: 'world' });
});

app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  process.stdout.write(`\n\napp listening on port ${process.env.PORT}\n\n`);
});

app.post('/api/saveBooks', (req, res, next) => {
  const { googleId, title, author, publishedYear, isbn, coverImgURL, ...rest } = req.body;

  let completedAt = null;
  if (rest.completedAt !== undefined) {
    completedAt = rest.completedAt;
  }

  let description = null;
  if (rest.description !== undefined) {
    description = rest.description;
  }

  if (!googleId || !title || !author || !publishedYear || !isbn || !coverImgURL) {
    throw new ClientError(
      400,
      'googleId, title, author, description, publishedYear, isbn, coverImgURL are required fields');
  }

  const sqlGetBookId = `
    select "bookId"
    from "books"
    where "isbn"= $1
  `;
  const paramsGetBookId = [isbn];

  const sqlsaveBook = `
    insert into "books"("googleId", "title", "author", "description", "publishedYear", "isbn", "coverImgURL")
    values ($1, $2, $3, $4, $5, $6, $7)
    returning *
    `;
  const paramsSaveBook = [googleId, title, author, description, publishedYear, isbn, coverImgURL];

  const sqlLibrary = `
      insert into "library" ("bookId", "userId",  "completedAt")
      values ($1, $2, $3)
      on conflict ("userId", "bookId")
      do nothing
      returning*
      `;

  db.query(sqlGetBookId, paramsGetBookId)
    .then(resultingBook => {
      if (resultingBook.rows.length) return resultingBook.rows[0].bookId;
      return db
        .query(sqlsaveBook, paramsSaveBook)
        .then(result => {
          const [savedBook] = result.rows;
          return savedBook.bookId;
        });
    })
    .then(bookId => {
      const paramsLibrary = [Number(bookId), 1, completedAt];
      return db
        .query(sqlLibrary, paramsLibrary)
        .then(result => result.rows);
    })
    .then(result => res.status(201).json(result))
    .catch(err => next(err));
});
