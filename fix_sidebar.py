import re

# Read the current page.tsx
with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the new sidebar
with open('sidebar_new.txt', 'r', encoding='utf-8') as f:
    new_sidebar = f.read()

# Pattern to match the old sidebar div
pattern = r'(          <div className="relative bg-slate-900 w-80 h-full overflow-y-auto p-6">)(.*?)(          </div>\s*</div>\s*\)\})'

# Replace
def replacer(match):
    return match.group(1) + '\n' + new_sidebar + '\n' + match.group(3)

content_new = re.sub(pattern, replacer, content, flags=re.DOTALL)

# Write back
with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content_new)

print("Sidebar updated successfully!")
