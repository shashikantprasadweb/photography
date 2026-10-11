#!/usr/bin/env python3
"""
Multi-Workspace Rule & Skill Synchronization Engine
---------------------------------------------------
Purpose: Synchronize shared core AI directives, engineering standards,
web/UI standards, and reusable skills across the 4 workspaces:
1. data-pilot (EdTech, training curriculum, IT services, calculators)
2. shashikant-prasad (Personal brand, photography showcase, travel journal)
3. My Projects (Incubation, utilities, general tech projects)
4. zms-intelligence-hub (Enterprise intelligence hub, corporate operations)

Tiered Governance:
- Tier 1 (Universal): 01-engineering-standards.md -> All Workspaces
- Tier 2 (Web Standards): 02-ui-standards.md -> Web Workspaces (data-pilot, shashikant-prasad, My Projects)
- Tier 3 (Domain-Exclusive): 00-active-branding.md, etc. -> NEVER synced across workspaces
- Reusable Skills: ui-page-build-standards, html_page_creation, html_to_pdf, rule-maintenance -> Web Workspaces
"""

import os
import shutil

WORKSPACES = {
    "data-pilot": {
        "path": "/Users/shashikant.prasad/Documents/data-pilot",
        "is_web": True,
        "is_corporate": False
    },
    "shashikant-prasad": {
        "path": "/Users/shashikant.prasad/Documents/shashikant-prasad",
        "is_web": True,
        "is_corporate": False
    },
    "My Projects": {
        "path": "/Users/shashikant.prasad/Documents/My Projects",
        "is_web": True,
        "is_corporate": False
    },
    "zms-intelligence-hub": {
        "path": "/Users/shashikant.prasad/Documents/zms-intelligence-hub",
        "is_web": False,
        "is_corporate": True
    }
}

TIER_1_UNIVERSAL_RULES = [
    "01-engineering-standards.md"
]

TIER_2_WEB_RULES = [
    "02-ui-standards.md"
]

REUSABLE_WEB_SKILLS = [
    "ui-page-build-standards",
    "html_page_creation",
    "html_to_pdf",
    "rule-maintenance"
]

def sync_file_between(src_file, dst_file, label):
    if not os.path.exists(src_file):
        return 0
    if not os.path.exists(dst_file):
        os.makedirs(os.path.dirname(dst_file), exist_ok=True)
        shutil.copy2(src_file, dst_file)
        print(f"  ✅ Created {label}: {os.path.basename(src_file)} -> {dst_file}")
        return 1
    
    src_mtime = os.path.getmtime(src_file)
    dst_mtime = os.path.getmtime(dst_file)

    if src_mtime > dst_mtime + 1:
        shutil.copy2(src_file, dst_file)
        print(f"  🔄 Updated {label}: {os.path.basename(src_file)} -> {dst_file}")
        return 1
    return 0

def sync_dir_between(src_dir, dst_dir, label):
    if not os.path.exists(src_dir):
        return 0
    if not os.path.exists(dst_dir):
        shutil.copytree(src_dir, dst_dir, dirs_exist_ok=True)
        print(f"  ✅ Created skill {label}: {os.path.basename(src_dir)} -> {dst_dir}")
        return 1
    return 0

def run_sync():
    print("🔄 Starting Multi-Workspace Rules & Skills Synchronization...")
    
    active_workspaces = {k: v for k, v in WORKSPACES.items() if os.path.exists(v["path"])}
    print(f"Active detected workspaces: {list(active_workspaces.keys())}")
    
    if "data-pilot" not in active_workspaces:
        print("⚠️ Source workspace 'data-pilot' not found.")
        return

    dp_path = WORKSPACES["data-pilot"]["path"]
    total_synced = 0

    for name, target in active_workspaces.items():
        if name == "data-pilot":
            continue
        
        target_path = target["path"]
        print(f"\n📂 Syncing with [{name}]...")

        # 1. Tier 1: Universal Rules
        for rule in TIER_1_UNIVERSAL_RULES:
            src = os.path.join(dp_path, ".agents/rules", rule)
            dst = os.path.join(target_path, ".agents/rules", rule)
            total_synced += sync_file_between(src, dst, f"Tier 1 Rule ({name})")

        # 2. Tier 2: Web Rules (only for web projects)
        if target["is_web"]:
            for rule in TIER_2_WEB_RULES:
                src = os.path.join(dp_path, ".agents/rules", rule)
                dst = os.path.join(target_path, ".agents/rules", rule)
                total_synced += sync_file_between(src, dst, f"Tier 2 Web Rule ({name})")

            # Skills
            for skill in REUSABLE_WEB_SKILLS:
                src_skill = os.path.join(dp_path, ".agents/skills", skill)
                dst_skill = os.path.join(target_path, ".agents/skills", skill)
                total_synced += sync_dir_between(src_skill, dst_skill, f"Web Skill ({name})")

    print(f"\n✨ Multi-Workspace Synchronization Complete! ({total_synced} updates applied).")

if __name__ == "__main__":
    run_sync()
