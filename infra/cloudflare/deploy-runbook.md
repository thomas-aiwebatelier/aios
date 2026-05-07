# Cloudflare Pages Deploy Runbook

This runbook covers deploying generated SMB sites to Cloudflare Pages. It will be fleshed out in Task 1.4 (Cloudflare Pages wiring) and Task 4.3 (production hardening).

## Overview

Each generated site lives under `generated-sites/<slug>/` and is deployed as a separate Cloudflare Pages project. The deploy is triggered programmatically via the Cloudflare API using the token stored in `CLOUDFLARE_API_TOKEN`.

## Manual Deploy (stub)

Steps for a one-off manual deploy will be documented in Task 1.4.

## Automated Deploy (stub)

The automated deploy pipeline (triggered by the site-generation cron job) will be documented in Task 4.3.

## Rollback (stub)

Cloudflare Pages retains previous deployments. Rollback steps will be documented in Task 4.3.
