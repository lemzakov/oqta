#!/bin/bash

# Vercel migration script
# Delegates to smart-migrate.sh which uses 'prisma migrate deploy' for safe,
# additive-only migrations.  Manually added tables and columns are never dropped.

exec bash "$(dirname "$0")/smart-migrate.sh"
