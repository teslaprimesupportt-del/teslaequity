import re
with open('/home/z/my-project/src/app/(dashboard)/tracking/page.tsx', 'r') as f:
    lines = f.readlines()

depth = 0
for i, line in enumerate(lines[190:210], 191):
    opens = len(re.findall(r'<div[\s>]', line))
    closes = len(re.findall(r'</div>', line))
    self_closes = len(re.findall(r'\/>', line))
    depth += opens - closes
    print(f'L{i+1}: +{opens} -{closes} = {depth:3d}  | {line.rstrip()[:75]}')
