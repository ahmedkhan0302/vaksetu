import json
import os
import random

output_file = "supabase/migrations/20260227000001_add_flexible_quizzes.sql"
ALL_GLOSS_IDS = list(range(1, 36))
SYSTEM_ADMIN_ID = "00000000-0000-0000-0000-000000000000"


def generate_flexible_questions(q_type, count=6):
    questions = []
    quiz_glosses = random.sample(ALL_GLOSS_IDS, count)

    for i, gloss_id in enumerate(quiz_glosses, 1):
        wrong_options = random.sample(
            [idx for idx in ALL_GLOSS_IDS if idx != gloss_id], 3
        )
        options = wrong_options + [gloss_id]
        random.shuffle(options)

        # We now add the 'type' directly into each question object
        questions.append(
            {
                "q_no": i,
                "q_type": q_type,  # <--- Type is now inside the question
                "q_text": "Identify the correct sign",
                "q_gloss_id": gloss_id,
                "options": options,
            }
        )
    return json.dumps({"questions": questions})


quiz_configs = [
    ("Number Quiz 1", "EASY", "image_mcq"),
    ("Number Quiz 2", "EASY", "image_mcq"),
    ("Alpha Mix", "EASY", "image_mcq"),
    ("Sign Matcher 1", "EASY", "sign_mcq"),
    ("Sign Matcher 2", "EASY", "sign_mcq"),
    ("Foundational Mix", "EASY", "sign_mcq"),
]

sql_template = "INSERT INTO public.quiz (title, description, difficulty, content, created_by) VALUES \n"
entries = []

for title, diff, q_type in quiz_configs:
    content = generate_flexible_questions(q_type, 6)
    entries.append(
        f"('{title}', 'Practice session', '{diff}', '{content}', '{SYSTEM_ADMIN_ID}')"
    )

full_sql = (
    "-- Migration to use per-question types\n"
    + sql_template
    + ",\n".join(entries)
    + ";"
)

with open(output_file, "w") as f:
    f.write(full_sql)

print(f"✅ Created flexible quiz migration in {output_file}")
