# Operating Runbook

This document covers operational procedures for running AI Web Atelier unattended. It will be fleshed out in Week 4.

## Vacation / PC-Off Windows

When the operator is away for extended periods, outreach and site-generation cron jobs must be paused gracefully to avoid sending emails or incurring Cloudflare deploy costs while unmonitored.

## Pausing Cron Jobs

Steps to pause all scheduled tasks before going offline: stop the cron runner, confirm no jobs are queued, and document the pause date.

## Gmail Vacation Responder

Enable Gmail's built-in vacation responder so prospects who reply during the pause receive an automated acknowledgement. Configure via Gmail Settings > See all settings > General > Vacation responder.

## Resuming Safely

On return: verify the DB is consistent, re-enable cron jobs one at a time, check the outreach queue for stale entries older than the pause window, and drain any backlog before resuming normal cadence.
