import re

# Read the current page.tsx
with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the sidebar section and replace it
in_sidebar = False
sidebar_start = -1
sidebar_end = -1
indent_count = 0

for i, line in enumerate(lines):
    if '<div className="relative bg-slate-900 w-80 h-full overflow-y-auto p-6">' in line:
        sidebar_start = i
        in_sidebar = True
        indent_count = 1
    elif in_sidebar:
        if '<div' in line:
            indent_count += line.count('<div')
        if '</div>' in line:
            indent_count -= line.count('</div>')
        if indent_count == 0:
            sidebar_end = i
            break

if sidebar_start != -1 and sidebar_end != -1:
    # Read new sidebar
    with open('sidebar_new.txt', 'r', encoding='utf-8') as f:
        new_sidebar_lines = f.readlines()
    
    # Replace
    new_lines = lines[:sidebar_start] + new_sidebar_lines + lines[sidebar_end+1:]
    
    # Write back
    with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"Sidebar updated successfully! Replaced lines {sidebar_start+1} to {sidebar_end+1}")
else:
    print("Could not find sidebar section!")
