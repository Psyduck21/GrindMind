import os
import re

directories = ['src', 'app']
replacements = {
    'db.getAllSync': 'await db.getAllAsync',
    'db.getFirstSync': 'await db.getFirstAsync',
    'db.runSync': 'await db.runAsync',
    'db.execSync': 'await db.execAsync',
    'db.withTransactionSync': 'await db.withTransactionAsync'
}

for d in directories:
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                
                original_content = content
                for k, v in replacements.items():
                    content = content.replace(k, v)
                
                if content != original_content:
                    with open(filepath, 'w') as f:
                        f.write(content)
                    print(f"Updated {filepath}")
