#!/bin/bash
# ============================================================================
# Bulk-create hackathon participants: Cognito login + Leader/Team in RDS.
#
# For each row in the input CSV this script:
#   1. Creates a Cognito user in the Participants group (via CognitoUserManager)
#   2. Overrides the password with a unique, random per-participant password
#   3. Inserts a Leader row and a Team row into RDS (via SqlEditorLambda)
#   4. Appends email + password + team to an output credentials CSV
#
# It reuses the platform's existing Lambdas — no new infrastructure.
#
# INPUT CSV (header required), columns: email,name,team_name
#   alice@example.com,Alice Tan,Team Rocket
#   bob@example.com,Bob Lee,Team Rocket          # same team_name => same team
#
# Rows sharing a team_name are grouped: the FIRST row for a team becomes the
# Leader and owns the Team row; later rows with that team_name still get their
# own Cognito login but are attached to the existing team (no duplicate Team).
#
# OUTPUT CSV (default: participant_credentials_<timestamp>.csv), columns:
#   email,password,team_name,team_id,status
#
# Usage:
#   ./scripts/bulk_create_participants.sh <input.csv> [output.csv] [--dry-run]
#
# Requires: aws cli, jq, uuidgen, and AWS creds for the prod account.
# ============================================================================
set -euo pipefail

# ---- Config (prod us-east-1) ----------------------------------------------
REGION="${REGION:-us-east-1}"
USER_POOL_ID="${USER_POOL_ID:-us-east-1_oABgAXtRj}"
GROUP_NAME="${GROUP_NAME:-Participants}"
DEFAULT_TRACK_ID="${DEFAULT_TRACK_ID:-72101be3-6921-11f0-b168-0efd9d2909e1}"
DEFAULT_PROBLEM_ID="${DEFAULT_PROBLEM_ID:-prob-system}"
COGNITO_FN="${COGNITO_FN:-hackhub-prod-CognitoUserManager}"
SQL_FN="${SQL_FN:-hackhub-prod-SqlEditorLambda}"

# ---- Args ------------------------------------------------------------------
INPUT_CSV="${1:-}"
OUTPUT_CSV="${2:-}"
DRY_RUN=0
for a in "$@"; do [ "$a" = "--dry-run" ] && DRY_RUN=1; done
# Allow --dry-run to be passed as the 2nd arg without an output filename.
[ "${OUTPUT_CSV:-}" = "--dry-run" ] && OUTPUT_CSV=""

if [ -z "$INPUT_CSV" ] || [ ! -f "$INPUT_CSV" ]; then
  echo "ERROR: input CSV not found. Usage: $0 <input.csv> [output.csv] [--dry-run]" >&2
  exit 1
fi
# new Date() / random timestamps come from the shell, not the agent.
TS="$(date +%Y%m%d_%H%M%S)"
[ -z "$OUTPUT_CSV" ] && OUTPUT_CSV="participant_credentials_${TS}.csv"

# ---- Helpers ---------------------------------------------------------------
sql_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

gen_password() {
  # 16-char password guaranteed to satisfy typical Cognito policies
  # (upper, lower, digit, symbol). Avoids shell-hostile characters.
  local base
  base="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 12)"
  printf 'Hh1!%s' "$base"
}

invoke_sql() {
  local sql="$1" out
  out="$(mktemp)"
  aws lambda invoke --function-name "$SQL_FN" --region "$REGION" \
    --cli-binary-format raw-in-base64-out \
    --payload "{\"sql\":\"$sql\"}" "$out" >/dev/null 2>&1
  # Surface DB-side errors (the Lambda returns 200 with a body either way).
  if grep -qiE '"errno"|"sqlMessage"|"code":"ER_|statusCode":5' "$out"; then
    echo "    SQL error: $(head -c 300 "$out")" >&2
    rm -f "$out"; return 1
  fi
  rm -f "$out"; return 0
}

# ---- Run -------------------------------------------------------------------
echo "Input:        $INPUT_CSV"
echo "Output creds: $OUTPUT_CSV"
echo "User pool:    $USER_POOL_ID  (group: $GROUP_NAME)"
echo "Dry run:      $([ "$DRY_RUN" = 1 ] && echo yes || echo no)"
echo "-----------------------------------------------------------------"

echo "email,password,team_name,team_id,status" > "$OUTPUT_CSV"

# Team registry kept on disk (portable to bash 3.2 and survives the pipe
# subshell below): one file per team, named after a hash of the team_name,
# containing "team_id leader_id".
TEAM_DIR="$(mktemp -d)"
trap 'rm -rf "$TEAM_DIR"' EXIT
team_key() { printf '%s' "$1" | cksum | cut -d' ' -f1; }

row=0

# Skip header line; read the rest. Process substitution (not a pipe) keeps the
# loop in the current shell so the on-disk registry behaves predictably.
while IFS=',' read -r email name team_name _rest || [ -n "$email" ]; do
  row=$((row+1))
  # Trim surrounding whitespace/CR.
  email="$(echo "$email" | tr -d '\r' | xargs)"
  name="$(echo "$name" | tr -d '\r' | sed 's/^ *//; s/ *$//')"
  team_name="$(echo "$team_name" | tr -d '\r' | sed 's/^ *//; s/ *$//')"
  [ -z "$email" ] && continue

  echo "[$row] $email  ($name)  team='$team_name'"

  password="$(gen_password)"
  e_email="$(sql_escape "$email")"
  e_team="$(sql_escape "$team_name")"

  if [ "$DRY_RUN" = 1 ]; then
    echo "    DRY: would create Cognito user, set password, insert Leader/Team"
    echo "$email,$password,$team_name,DRYRUN,dry-run" >> "$OUTPUT_CSV"
    continue
  fi

  # 1. Create Cognito user + add to group (idempotent; tolerates existing user).
  cog_out="$(aws lambda invoke --function-name "$COGNITO_FN" --region "$REGION" \
      --cli-binary-format raw-in-base64-out \
      --payload "$(jq -nc --arg p "$USER_POOL_ID" --arg u "$email" --arg n "$name" --arg g "$GROUP_NAME" \
                   '{userPoolId:$p, username:$u, name:$n, groupName:$g}')" \
      /dev/stdout 2>/dev/null || true)"
  if ! echo "$cog_out" | grep -q '"statusCode": *200\|created/managed successfully'; then
    echo "    Cognito create FAILED: $(echo "$cog_out" | head -c 200)" >&2
    echo "$email,,$team_name,,cognito-failed" >> "$OUTPUT_CSV"
    continue
  fi

  # 2. Override with a unique permanent password (CognitoUserManager hardcodes one).
  if ! aws cognito-idp admin-set-user-password --region "$REGION" \
        --user-pool-id "$USER_POOL_ID" --username "$email" \
        --password "$password" --permanent >/dev/null 2>&1; then
    echo "    WARN: could not set unique password; default remains" >&2
    password="(default: see CognitoUserManager)"
  fi

  # 3. Leader + Team in RDS. First row of a team_name owns the team.
  team_file="$TEAM_DIR/$(team_key "$team_name")"
  if [ -f "$team_file" ]; then
    team_id="$(cut -d' ' -f1 "$team_file")"
    # Non-leader members get a Leader row too (so they can be looked up by email),
    # but are NOT given a second Team row.
    new_leader="$(uuidgen)"
    if invoke_sql "INSERT INTO Leader (leader_id, email_address, track_id) VALUES (\\\"$new_leader\\\", \\\"$e_email\\\", \\\"$DEFAULT_TRACK_ID\\\")"; then
      echo "    + member added to existing team $team_id"
      echo "$email,$password,$team_name,$team_id,member" >> "$OUTPUT_CSV"
    else
      echo "$email,$password,$team_name,$team_id,leader-insert-failed" >> "$OUTPUT_CSV"
    fi
  else
    leader_id="$(uuidgen)"; team_id="$(uuidgen)"
    if invoke_sql "INSERT INTO Leader (leader_id, email_address, track_id) VALUES (\\\"$leader_id\\\", \\\"$e_email\\\", \\\"$DEFAULT_TRACK_ID\\\")" \
       && invoke_sql "INSERT INTO Team (team_id, leader_id, problem_id, team_name) VALUES (\\\"$team_id\\\", \\\"$leader_id\\\", \\\"$DEFAULT_PROBLEM_ID\\\", \\\"$e_team\\\")"; then
      printf '%s %s\n' "$team_id" "$leader_id" > "$team_file"
      echo "    + created leader + team $team_id"
      echo "$email,$password,$team_name,$team_id,leader" >> "$OUTPUT_CSV"
    else
      echo "$email,$password,$team_name,,team-insert-failed" >> "$OUTPUT_CSV"
    fi
  fi
done < <(tail -n +2 "$INPUT_CSV")

echo "-----------------------------------------------------------------"
echo "Done. Credentials written to: $OUTPUT_CSV"
echo "Review the 'status' column for any *-failed rows."
