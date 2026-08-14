import re

with open('/home/z/my-project/src/app/(dashboard)/vehicles/page.tsx', 'r') as f:
    content = f.read()

# Remove emoji icons from STATUS_STEPS
content = re.sub(
    r", icon: '[^']*'",
    '',
    content
)

# Also remove emoji references in rendering (step.icon)
# Let's find and check if icon is used in rendering
icon_uses = [m.start() for m in re.finditer(r'step\.icon|\bicon\b', content)]
print(f'Found {len(icon_uses)} references to icon in vehicles page')

with open('/home/z/my-project/src/app/(dashboard)/vehicles/page.tsx', 'w') as f:
    f.write(content)

print('Done')
