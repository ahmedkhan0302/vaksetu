5.3 API Architecture & Endpoints
We used Next.js API Routes to create a standard interface for the frontend. These routes are kept minimalist; they primarily handle the incoming request and call the corresponding Drizzle queries to return the necessary data.

### 5.3.1 Endpoint Overview
The API is organized under the `/api/quiz` directory with the following primary endpoints:

* **`GET /api/quiz` (Discovery)**: This returns a list of all available quizzes. It only sends metadata—like the `id`, `title`, `description`, `difficulty`, and `type`—so the frontend can show a library of quizzes without downloading all the question data at once.

* **`GET /api/quiz/[id]` (Specific Quiz)**: This is the main endpoint for the quiz engine. It takes a unique ID and returns the fully **Hydrated Quiz Object**.

### 5.3.2 The Hydration Process
In our database, the `quiz` table stores questions as lightweight JSON references (e.g., pointing to `q_gloss_id: 101` and `options: [101, 102, 103, 104]`). To prevent the frontend from having to make dozens of requests to turn those references into actual text and pictures, the backend performs **Hydration**.

When `/api/quiz/[id]` is called, the Drizzle query layer (`quizzes.ts`) does the following:
1.  **Extracts relationships:** It scans the quiz JSON and collects a unique `Set` of all gloss IDs needed for the questions and options.
2.  **Batch Fetches:** It queries the `glosses` PostgreSQL table once using an `IN (...)` array, efficiently grabbing all names and image references in a single database round-trip.
3.  **Formats based on Type:** It dynamically maps the returning data. For an `"image_mcq"`, it populates the option array with images. For a `"sign_mcq"`, it populates the primary question with an image and leaves the options as pure text strings. 

### 5.3.3 Separation of Concerns
This API structure guarantees that the frontend and backend remain strictly independent. 

The frontend uses strict TypeScript Types (`ImageMCQQuestion` and `SignMCQQuestion`) when rendering the UI. Our Drizzle queries guarantee that the JSON returned from `/api/quiz/[id]` conforms 100% to those frontend definitions. The frontend developer only needs to interact with these JSON endpoints and never touches Drizzle or the PostgreSQL constraints. This makes the project highly maintainable, as the database can be scaled or migrated (as we did when we moved `type` to the root `quiz` table) without breaking the client-side code.
