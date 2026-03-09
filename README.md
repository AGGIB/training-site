# Java Exam Trainer (RU/KZ)

Минималистичный веб-тренажер для подготовки к экзамену:
- регистрация по имени и паролю
- два режима теста: по варианту и смешанный
- мгновенная проверка ответа
- статистика по точности и попыткам
- работа над ошибками до 3 верных подряд

## Технологии
- Next.js (App Router, TypeScript)
- PostgreSQL + Prisma
- Cookie session auth
- DOCX parser (правильные ответы по bold)
- Docker + Railway

## Быстрый старт локально
1. Создайте `.env` на базе `.env.example`.
2. Поднимите PostgreSQL (локально или в Docker).
3. Установите зависимости:
   ```bash
   npm install
   ```
4. Примените миграции:
   ```bash
   npm run db:migrate
   ```
5. Импортируйте вопросы из `data/questions.docx`:
   ```bash
   npm run db:seed
   ```
6. Запустите приложение:
   ```bash
   npm run dev
   ```

## API
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `POST /api/quiz/start`
- `POST /api/quiz/answer`
- `POST /api/quiz/finish`
- `GET /api/mistakes`
- `POST /api/mistakes/answer`

## Railway deploy
1. Подключите репозиторий в Railway.
2. Установите переменные:
   - `DATABASE_URL`
   - `SESSION_COOKIE_NAME` (например, `podgotovka_session`)
   - `SEED_DOCX_PATH` (по умолчанию `data/questions.docx`)
3. Railway соберет `Dockerfile`.
4. При старте контейнера автоматически выполняются:
   - `prisma migrate deploy`
   - `npm run db:seed`
   - `node server.js`

## Тесты
```bash
npm test
```

## Автор
agybay
