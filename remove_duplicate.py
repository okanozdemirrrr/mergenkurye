with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove duplicate showRestaurantSubmenu at line 71 (index 70)
new_lines = []
for i, line in enumerate(lines):
    # Skip line 71 if it contains the duplicate
    if i == 70 and 'const [showRestaurantSubmenu, setShowRestaurantSubmenu] = useState(false)' in line:
        print(f"Skipping duplicate line {i+1}: {line.strip()}")
        continue
    new_lines.append(line)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Duplicate removed successfully!")
