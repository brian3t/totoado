# TOTOSG Adonis fullstack application

This is the fullstack app for TOTOSG mobile app, it comes pre-configured with:

1. Bodyparser
2. Session
3. Authentication
4. Web security middleware
5. CORS
6. Edge template engine
7. Lucid ORM
8. Migrations and seeds

## Setup
- Add .env file to determine db settings, etc..
- Use the adonis command to install the blueprint


or manually clone the repo and then run `npm install`.


### Migrations

Run the following command to run startup migrations.

```js
adonis migration:run
```

### Console app:
- to pull toto results into database `lot`, run: `node ace scr_sg_pools` 
- 
