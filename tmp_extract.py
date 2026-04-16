import os
import re

thai_pattern = re.compile(r'>\s*([^<{]*[\u0e00-\u0e7f]+[^>}]*)\s*<|([\'"`])([^"\'`\n{]*[\u0e00-\u0e7f]+[^"\'`\n}]*)\2')

strings = set()

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = thai_pattern.finditer(content)
                for m in matches:
                    text = m.group(1) if m.group(1) else m.group(3)
                    if text:
                        strings.add(text.strip())

print(f"Found {len(strings)} unique Thai strings.")
for s in list(strings)[:20]:
    print(s)
