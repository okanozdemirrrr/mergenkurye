with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Add missing states after line 44 (showMenu)
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if i == 43 and 'const [showMenu, setShowMenu] = useState(false)' in line:
        new_lines.append('    const [showCourierSubmenu, setShowCourierSubmenu] = useState(false)\r\n')
        new_lines.append('    const [showRestaurantSubmenu, setShowRestaurantSubmenu] = useState(false)\r\n')

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("States added successfully!")
