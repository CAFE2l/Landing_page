#!/usr/bin/env python3
"""
Apply Supabase migration using REST API
"""

import sys
from pathlib import Path

import requests

SUPABASE_URL = "https://iuzvmlhowqghbbduhmzt.supabase.co"
MIGRATION_FILE = (
    Path(__file__).parent / "supabase" / "migrations" / "003_feedback_forum.sql"
)


def read_migration() -> str:
    """Read the migration SQL file."""
    if not MIGRATION_FILE.exists():
        raise FileNotFoundError(f"Migration file not found: {MIGRATION_FILE}")

    with open(MIGRATION_FILE, "r") as f:
        return f.read()


def split_sql_statements(sql_content: str) -> list:
    """Split SQL content into individual statements."""
    lines = sql_content.split("\n")
    statements = []
    current = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            continue

        current.append(line)
        if stripped.endswith(";"):
            statement = "\n".join(current).strip()
            if statement and not statement.startswith("--"):
                statements.append(statement)
            current = []

    return statements


def execute_migration(service_role_key: str) -> bool:
    """Execute migration via REST API."""

    print("=" * 60)
    print("Supabase Migration: Feedback Forum (REST API)")
    print("=" * 60)
    print()

    print("📖 Reading migration file...")
    sql_content = read_migration()
    print(f"✓ Migration file loaded: {MIGRATION_FILE}")
    print(f"✓ SQL contains {len(sql_content.splitlines())} lines")

    statements = split_sql_statements(sql_content)
    print(f"✓ Parsed {len(statements)} SQL statements\n")

    print("⚙️  Executing migration statements...\n")

    success_count = 0
    failed_count = 0

    for i, statement in enumerate(statements, 1):
        try:
            preview = statement[:80].replace("\n", " ")
            print(f"  [{i}/{len(statements)}] {preview}...")

            # Use RPC to execute SQL
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                headers={
                    "Authorization": f"Bearer {service_role_key}",
                    "Content-Type": "application/json",
                    "apikey": service_role_key,
                },
                json={"sql": statement},
                timeout=10,
            )

            if response.status_code in [200, 201]:
                success_count += 1
            else:
                error_msg = str(response.text).lower()
                if "already exists" in error_msg or "duplicate" in error_msg:
                    print(f"       ⊘ Skipped (already exists)")
                    success_count += 1
                else:
                    print(
                        f"       ✗ Error: {response.status_code} - {response.text[:100]}"
                    )
                    failed_count += 1
        except Exception as e:
            print(f"       ✗ Error: {str(e)}")
            failed_count += 1

    print(f"\n✅ Executed: {success_count} statements")
    if failed_count > 0:
        print(f"⚠️  Failed: {failed_count} statements\n")
        return False

    print("\n📊 Migration Summary:")
    print("  ✓ feedback_posts: Added columns (comment_count, helpful_count, etc.)")
    print("  ✓ feedback_media: Added alt_text column")
    print("  ✓ feedback_comments: Added user_avatar and status columns")
    print("  ✓ feedback_helpful_votes: New table created with RLS policies")
    print("  ✓ RPC functions: Created for atomic counter updates")
    print("  ✓ Indexes: Created for performance optimization")
    print("  ✓ RLS policies: Updated for feedback_posts and feedback_comments")

    return True


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\n❌ Error: SERVICE_ROLE_KEY argument is required\n")
        print("Example:")
        print("  python apply_migration_rest.py sbpg_YOUR_SERVICE_ROLE_KEY_HERE\n")
        sys.exit(1)

    service_role_key = sys.argv[1]

    if not service_role_key or service_role_key.startswith("-"):
        print("❌ Error: Invalid SERVICE_ROLE_KEY\n")
        sys.exit(1)

    success = execute_migration(service_role_key)

    print()
    if success:
        print("✅ All done! Your database is ready.")
        sys.exit(0)
    else:
        print("❌ Migration completed with errors. Please check above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
