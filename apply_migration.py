#!/usr/bin/env python3
"""
Apply Supabase Migration 003: Feedback Forum

This script reads the migration SQL file and executes it against your Supabase database.

Requirements:
  - psycopg2: pip install psycopg2-binary

Usage:
  python apply_migration.py <SERVICE_ROLE_KEY>

Where SERVICE_ROLE_KEY is your Supabase Service Role Key from Settings → API
"""

import os
import sys
from pathlib import Path

import psycopg2

# Supabase connection details
SUPABASE_URL = "https://iuzvmlhowqghbbduhmzt.supabase.co"
SUPABASE_HOST = "iuzvmlhowqghbbduhmzt.supabase.co"
SUPABASE_PORT = 5432
SUPABASE_DB = "postgres"
SUPABASE_USER = "postgres"

# Path to migration file
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
    """Split SQL content into individual statements, filtering out comments."""
    lines = sql_content.split("\n")
    statements = []
    current = []

    for line in lines:
        # Skip empty lines and comments
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
    """Execute the migration SQL using the Service Role Key as password."""

    print("📖 Reading migration file...")
    sql_content = read_migration()
    print(f"✓ Migration file loaded: {MIGRATION_FILE}")
    print(f"✓ SQL contains {len(sql_content.splitlines())} lines")

    # Split into individual statements
    statements = split_sql_statements(sql_content)
    print(f"✓ Parsed {len(statements)} SQL statements\n")

    print("🔗 Connecting to Supabase database...")
    try:
        conn = psycopg2.connect(
            host=SUPABASE_HOST,
            port=SUPABASE_PORT,
            database=SUPABASE_DB,
            user=SUPABASE_USER,
            password=service_role_key,
            sslmode="require",
        )
        print("✓ Connected successfully\n")
    except psycopg2.OperationalError as e:
        print(f"✗ Connection failed: {e}")
        print("\n💡 Tips:")
        print("   - Check if Service Role Key is correct")
        print("   - Verify your Supabase project URL")
        print("   - Make sure you copied the entire key (it's usually very long)")
        sys.exit(1)
    except psycopg2.Error as e:
        print(f"✗ Connection error: {e}")
        sys.exit(1)

    cursor = conn.cursor()
    success_count = 0
    failed_count = 0

    try:
        print("⚙️  Executing migration statements...\n")
        for i, statement in enumerate(statements, 1):
            try:
                # Show what we're executing (first 80 chars)
                preview = statement[:80].replace("\n", " ")
                print(f"  [{i}/{len(statements)}] {preview}...")
                cursor.execute(statement)
                conn.commit()
                success_count += 1
            except psycopg2.Error as e:
                # Some errors are expected (e.g., "already exists")
                error_msg = str(e).lower()
                if "already exists" in error_msg or "duplicate" in error_msg:
                    print(f"       ⊘ Skipped (already exists)")
                    success_count += 1
                else:
                    print(f"       ✗ Error: {e}")
                    failed_count += 1
                conn.rollback()

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

    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        conn.rollback()
        return False

    finally:
        cursor.close()
        conn.close()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\n❌ Error: SERVICE_ROLE_KEY argument is required\n")
        print("Example:")
        print("  python apply_migration.py sbpg_YOUR_SERVICE_ROLE_KEY_HERE\n")
        sys.exit(1)

    service_role_key = sys.argv[1]

    if not service_role_key or service_role_key.startswith("-"):
        print("❌ Error: Invalid SERVICE_ROLE_KEY\n")
        sys.exit(1)

    print("=" * 60)
    print("Supabase Migration: Feedback Forum")
    print("=" * 60)
    print()

    success = execute_migration(service_role_key)

    print()
    if success:
        print("✅ All done! Your database is ready.")
        sys.exit(0)
    else:
        print("❌ Migration failed. Please check the error above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
