import os

# Configuration
output_file = "supabase/migrations/20260227000000_add_gloss_data.sql"
image_dir = "public/Glosses"
numbers = [str(i) for i in range(1, 10)]  # 1-9
alphabets = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

sql_header = "-- Auto-generated Alphanumeric Glosses Seed\n"
sql_insert = "INSERT INTO public.glosses (gloss_name, image_url, gloss_tags) VALUES \n"

entries = []

# Process Numbers 1-9
for num in numbers:
    # SQL Format: ('name', 'url', ARRAY['tag1', 'tag2'])
    entry = f"('{num}', '/Glosses/{num}.jpg', ARRAY['number', 'digit'])"
    entries.append(entry)

# Process Alphabets A-Z
for char in alphabets:
    entry = f"('{char}', '/Glosses/{char}.jpg', ARRAY['alphabet', 'letter'])"
    entries.append(entry)

# Combine everything
full_sql = sql_header + sql_insert + ",\n".join(entries) + ";"

# Write to file
os.makedirs(os.path.dirname(output_file), exist_ok=True)
with open(output_file, "w") as f:
    f.write(full_sql)

print(f"✅ Migration file created at: {output_file}")
print(f"📊 Total entries generated: {len(entries)}")
